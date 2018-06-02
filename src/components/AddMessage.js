import React from 'react';
import { MessageList, ChatList, Input } from 'react-chat-elements'
import { Button } from 'antd';
import { Mutation } from 'react-apollo';
import gql from 'graphql-tag';

const MESSAGE_QUERY = gql`
   query msgQuery($domain: String!) {
     messages(domain: $domain) {
       content
       createdAt
       from
       to
     }
     users {
      domain
      lastLogin
    }
   }
 `;

const ADD_MESSAGE = gql`
mutation addMessage($message: NewMessage!){
    addMessage(message: $message) {
        content
        createdAt
        from
        to
  }
}
`;
const AddMessage = (props) => {
    let inputRef;

    return (
        <Mutation
            mutation={ADD_MESSAGE}
            // update={(cache, { data: { addMessage } }) => {
            //     const { messages, users } = cache.readQuery({ query: MESSAGE_QUERY });
            //     console.log("Cache", cache)
            //     cache.writeQuery({
            //         query: MESSAGE_QUERY,
            //         data: { messages: messages.concat([addMessage]), users }
            //     });
            // }}
        >
            {addMessage => (
                <div>
                    <Input
                        placeholder="Type here..."
                        multiline={true}
                        autoHeight={true}
                        rightButtons={
                            <Button type="primary" icon="rocket" size="large" onClick={() => {
                                addMessage({
                                    variables: {
                                        message: {
                                            content: inputRef.input.value,
                                            from: localStorage.getItem("domain"),
                                            to: props.to
                                        }
                                    }
                                });
                                inputRef.state.value = ""
                            }} />
                        }
                        ref={node => {
                            inputRef = node;
                        }} />
                </div>
            )}
        </Mutation>
    );
};

export default AddMessage;