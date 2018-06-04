

const express = require('express');
const {
    graphqlExpress,
    graphiqlExpress,
} = require('apollo-server-express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { execute, subscribe } = require('graphql');
const { createServer } = require('http');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const axios = require('axios');
const moment = require('moment');
const { PubSub, withFilter } = require('graphql-subscriptions');
const { makeExecutableSchema } = require("graphql-tools");
const path = require('path');

class User {
    constructor(domain, firstLogin, lastLogin) {
        this.domain = domain;
        this.firstLogin = firstLogin;
        this.lastLogin = lastLogin;
        this.message = {
            content: "No message yet.",
            from: domain,
            to: domain,
            createdAt: lastLogin
        }
    }
}
class Database {
    constructor() {
        this.users = [];
        this.messages = [];
    }
    addUser(domain, lastLogin) {
        let user = this.users.filter(user => user.domain === domain);
        if (user.length > 0) {
            user[0].lastLogin = lastLogin;
            return null;
        } else {
            this.users.push(user = new User(domain, lastLogin, lastLogin));
        }
        return user;
    }
    addMessage(message) {
        this.messages.push(message);
    }
    getUsers() {
        console.log("Get users");
        return this.users;
    }
    getUser(domain) {
        return this.users.filter(u => u.domain === domain)[0];
    }
    getUserMessages(domain) {
        console.log("Get message for user: " + domain);
        return this.messages.filter(msg => msg.from === domain || msg.to === domain);
    }
    getLastMessage(currentUser, loginUser) {
        console.log("Domain: ", currentUser, loginUser);
        let messages = this.messages.filter(msg => (msg.from === currentUser && msg.to === loginUser)
            || (msg.from === loginUser && msg.to === currentUser));
        return messages.length > 0 ? messages[messages.length - 1] : { content: "No message yet.", from: currentUser, to: loginUser, createdAt: moment().format("YYYY-MM-DD HH:mm") }
    }
}



const typeDefs = [`
type User {
    domain: String
    firstLogin: String
    lastLogin: String
    messages: [Message]
    message(domain: String!): Message
}
type Message {
    content: String
    createdAt: String
    from: String
    to: String
}

input NewMessage {
    content: String!
    from: String!
    to: String!
}
type Query {
    messages(domain: String!): [Message]
    users(domain: String!): [User]
}
type Subscription {
    messageAdded(domain: String!): Message
    userAdded: User
}
type Mutation {
    addMessage(message: NewMessage!): Message
}

schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
}`];

const db = new Database();
const pubsub = new PubSub();
const resolvers = {
    Query: {
        users(root, args, context) {
            console.log(">>", args.domain)
            return db.getUsers();
        },
        messages(root, args, context) {
            return db.getUserMessages(args.domain);
        }
    },
    User: {
        messages(root, args, context) {
            return db.getUserMessages(root.domain);
        },
        message(root, args, context) {
            return db.getLastMessage(root.domain, args.domain);
        }
    },
    Mutation: {
        addMessage(root, args, context) {
            let message = args.message;
            console.log("New message ", message);
            if (!message.content || !message.from || !message.to) {
                throw new Error(`Couldn't add new message, invalid values.`);
            }
            message.createdAt = moment().format("YYYY/MM/DD HH:mm:ss");
            db.addMessage(message);
            pubsub.publish("messageAdded", { messageAdded: message, to: message.to, from: message.from });
            return message;
        }
    },
    Subscription: {
        messageAdded: {
            subscribe: withFilter(
                () => pubsub.asyncIterator('messageAdded'),
                (payload, variables) => {
                    console.log(payload, "----", variables)
                    return payload.from === variables.domain || payload.to === variables.domain;
                }
            )
        },
        userAdded: {
            subscribe: () => pubsub.asyncIterator('userAdded')
        }
    }
};

const validateUser = (domain, otp) => {
    // const params = new URLSearchParams();
    // params.append('username', domain);
    // params.append('passcode', otp);
    // axios.post("https://security.vng.com.vn/token-gateway/api/verify_otp/", params)
    // .then(addUser(connectionParams.domain))
    // .then((user) => {
    //     return {
    //         currentUser: user,
    //     };
    // })

    let user = db.addUser(domain, moment().format("YYYY/MM/DD HH:mm:ss"));
    if (user) {
        pubsub.publish("userAdded", { userAdded: user });
    }
    return user;
}

// db.addUser("thieuvt", moment().format("YYYY/MM/DD HH:mm:ss"));
// db.addUser("dnhcc", moment().format("YYYY/MM/DD HH:mm:ss"));

const PORT = 8080;
const schema = makeExecutableSchema({ typeDefs, resolvers });
const app = express();

app.use(express.static(path.join(__dirname, 'build')));
app.use('*', cors({ origin: `http://localhost:3000` }));
app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));
app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
    subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`
}));
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
// Wrap the Express server
const ws = createServer(app);
ws.listen(PORT, () => {
    console.log(`Apollo Server is now running on http://localhost:${PORT}`);
    // Set up the WebSocket for handling GraphQL subscriptions
    new SubscriptionServer({
        execute,
        subscribe,
        schema,
        onConnect: (connectionParams, webSocket) => {
            console.log("onConnect");
            if (connectionParams && connectionParams.domain) {
                return validateUser(connectionParams.domain, connectionParams.otp);
            }

            return {};
            throw new Error('Missing domain. otp!');
        },
        // onOperation: (message, params, webSocket) => {
        //     console.log("onOperation", message);
        //     return message;
        //     // ...
        // },
        // onOperationDone: webSocket => {
        //     console.log("onOperationDone");
        //     // ...
        // },
        // onDisconnect: (webSocket, context) => {
        //     console.log("onDisconnect", webSocket.domain);
        //     // ...
        // }
    }, {
            server: ws,
            path: '/subscriptions',
        });
});