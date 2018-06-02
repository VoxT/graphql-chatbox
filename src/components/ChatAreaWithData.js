import React from 'react';
import ChatArea from './ChatArea.js';
import {
  Query,
} from 'react-apollo';
import gql from 'graphql-tag';



const MESSAGE_QUERY = gql`
   query msgQuery($domain: String!) {
     messages(domain: $domain) {
       content
       createdAt
       from
       to
     }
     users(domain: $domain) {
      domain
      lastLogin
      message(domain: $domain) {
        content
      }
    }
   }
 `;

const ChatAreaWithData = (props) => (
  <Query
    query={MESSAGE_QUERY}
    variables={{ domain: props.domain }}
  >
    {({ ...result }) => (
      <ChatArea
        {...props}
        {...result}
      />
    )}

  </Query>
)

export default ChatAreaWithData;