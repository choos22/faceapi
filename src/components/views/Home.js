import React from "react";
import { NavLink } from "react-router-dom";

function Home(props) {
  return (
    <div>
      <h2>Face Api</h2>
      <li>
        <NavLink to="/photo">Check đeo kính</NavLink>
      </li>
      <li>
        <NavLink to="/image">Check đeo khẩu trang</NavLink>
      </li>
    </div>
  );
}

export default Home;
