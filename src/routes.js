import {
    HashRouter as Router,
    Route,
    Switch
} from 'react-router-dom';
import React from 'react';



import Home from './components/primary/full/home';


const routes = (
    <Router>
    <div>
        <Switch>
            <Route exact path="/" component={Home}/>

        </Switch>
    </div>
    </Router>
);

export default routes;