import React from 'react';
import ReactDOM from 'react-dom';
import './styles/index.css';
import App from './components/App';
import { Router, Route, IndexRoute } from 'react-router';
// RCE CSS
import 'react-chat-elements/dist/main.css';

// const router = (
//     <Router>
//         <Route path="/" component={App}>
//         </Route>
//     </Router>
// )

ReactDOM.render(
    <App/>
    , document.getElementById('root'));