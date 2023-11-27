// import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import Home from "./components/views/Home";
import ImageTest from "./components/views/imageTest";
import Image from "./components/views/image";
import "./App.css";
function App() {
  return (
    <>
      <div className="App">
        <Router>
          <Switch>
            <Route path="/" exact>
              <Home />
            </Route>
            <Route path="/photo">
              <ImageTest />
            </Route>
            <Route path="/image">
              <Image />
            </Route>
            {/* <Route exact path="/photo" component={Image} /> */}
            {/* <Route exact path="/camera" component={VideoInput} /> */}
          </Switch>
        </Router>
      </div>
    </>
  );
}

export default App;
