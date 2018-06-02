
import React from 'react';
import { MessageList, ChatList, Input } from 'react-chat-elements'
import { Button } from 'antd';
import moment from 'moment';
import AddMessage from './AddMessage';
import gql from 'graphql-tag';
import notifyMe from './NotifyMe';

const USER_SUBSCRIPTION = gql`
  subscription userAddedSubscription {
    userAdded {
      domain
      lastLogin
      message {
        content
        from
        to
        createdAt
      }
    }
  }
`;

const MESSAGE_SUBSCRIPTION = gql`
  subscription messageAdded($domain: String!) {
    messageAdded(domain: $domain) {
      content
      createdAt
      from
      to
    }
  }
`;
class ChatArea extends React.Component {
    state = {
        activeChatDomain: localStorage.getItem("domain")
    }
    subscribeToMewUser = () => {
        this.props.subscribeToMore({
            document: USER_SUBSCRIPTION,
            updateQuery: (prev, { subscriptionData }) => {
                if (!subscriptionData.data) return prev;
                const userAdded = subscriptionData.data.userAdded;

                return Object.assign({}, prev, {
                    users: [...prev.users, userAdded]
                });
            }
        });
    }
    subscribeToNewMessages = () => {
        this.props.subscribeToMore({
            document: MESSAGE_SUBSCRIPTION,
            variables: { domain: this.props.domain },
            updateQuery: (prev, { subscriptionData }) => {
                if (!subscriptionData.data) return prev;
                const messageAdded = subscriptionData.data.messageAdded;

                if (messageAdded.from !== this.state.activeChatDomain
                    && (messageAdded.from !== localStorage.getItem("domain"))) {
                    notifyMe(messageAdded.from, messageAdded.content, messageAdded.from, (domain) => {
                        this.setState({activeChatDomain: domain})
                    })
                }

                let users = Object.assign([], prev.users);
                users = users.map(user => {
                    if (user.domain === messageAdded.from) {
                        return {
                            domain: user.domain,
                            lastLogin: messageAdded.lastLogin,
                            message: messageAdded,
                            __typename: user.__typename
                        };
                    }
                    return user;
                })
                return Object.assign({}, prev, {
                    messages: [...prev.messages, messageAdded],
                    users
                });
            }
        })
    }

    componentDidMount() {
        this.subscribeToNewMessages();
        this.subscribeToMewUser();
    }

    render() {
        let content = "";
        if (this.props.loading) {
            content = "Loading...";
        } else if (this.props.error) {
            content = `Error! ${this.props.error.message}`;
        } else {
            content = (
                <div>
                    <div className="login-user"><a onClick={() => {
                        localStorage.clear();
                        window.location.reload()
                    }}> {localStorage.getItem("domain")} >> </a></div>
                    <div className="left">
                        <ChatList
                            className='chat-list'
                            onClick={(user) => this.setState({ activeChatDomain: user.title.props.children })}
                            dataSource={!this.props.loading
                                && this.props.data.users
                                    .map(user => {
                                        return {
                                            avatar: 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png',
                                            alt: 'Reactjs',
                                            title: <strong className={user.domain === this.state.activeChatDomain ? "active" : ""}>{user.domain}</strong>,
                                            subtitle: <em className={user.domain === this.state.activeChatDomain ? "active" : ""}>{user.message.content}</em>,
                                            date: moment(user.lastLogin).toDate(),
                                            unread: 0,
                                        }
                                    })}
                        />
                    </div>
                    <div className="right">
                        <MessageList
                            className='message-list'
                            lockable={true}
                            toBottomHeight={'100%'}
                            dataSource={!this.props.loading
                                && (this.props.data.messages.filter(msg => (msg.from === this.state.activeChatDomain && msg.to === localStorage.getItem("domain"))
                                    || (msg.from === localStorage.getItem("domain") && msg.to === this.state.activeChatDomain))
                                    .map(msg => {
                                        return {
                                            position: (msg.from == localStorage.getItem("domain")) ? 'left' : 'right',
                                            type: 'text',
                                            text: msg.content,
                                            date: moment(msg.createdAt).toDate()
                                        }
                                    }))} />
                        <AddMessage to={this.state.activeChatDomain} />
                    </div>
                </div>
            )
        }
        return content;
    }
}

export default ChatArea;