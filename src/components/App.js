import React, { Component } from 'react';
import LoginForm from './LoginForm.js';

import logo from '../logo.svg';
import '../styles/App.css';

import 'antd/dist/antd.css';
import ChatArea from './ChatArea.js';
import {
  ApolloProvider
} from 'react-apollo';
import ApolloClient from "apollo-client";
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { getOperationAST } from 'graphql';
import ChatAreaWithData from './ChatAreaWithData.js';
import notifyMe from './NotifyMe.js';


const httpUri = `https://graphql-chating.herokuapp.com/graphql`;
const wsUri = 'ws://graphql-chating.herokuapp.com/subscriptions';
class App extends Component {

  render() {

    let content = null;
    if (localStorage.getItem("domain")) {
      const link = ApolloLink.split(
        operation => {
          const operationAST = getOperationAST(operation.query, operation.operationName);
          return !!operationAST && operationAST.operation === 'subscription';
        },
        new WebSocketLink({
          uri: wsUri,
          options: {
            reconnect: true, //auto-reconnect
            // // carry login state (should use secure websockets (wss) when using this)
            connectionParams: {
              domain: localStorage.getItem("domain")
            }
          }
        }),
        new HttpLink({ uri: httpUri })
      );

      const cache = new InMemoryCache();

      const client = new ApolloClient({
        link,
        cache
      });
      notifyMe("Chat.me", "Welcome " + localStorage.getItem("domain"))
      content = (
        <ApolloProvider client={client}>
          <div className="container">
            <ChatAreaWithData {...this.props}
              domain={localStorage.getItem("domain")}
            />
          </div>
        </ApolloProvider>
      )
    } else {
      content = <LoginForm />
    }

    return (
      content
    );
  }
}

export default App;
