"use client";
import React from "react";
import { Button } from "../ui/button";
const Navbar = () => {
  return (
    <div className="  flex justify-between items-center py-4 pr-4">
      <div className="flex items-center pt-2"><img src="/Zenith.svg" alt="logo" className="size-30 h-10" /></div>{" "}
      <div className="mid flex gap-10 items-center ">
        <a href="/features">Features</a>
        <a href="/integration">Integration</a>
      </div>{" "}
      <div className=" flex gap-10 items-center">
        {" "}
        <div>Login</div>
        <Button/>
      </div>
    </div>
  );
};

export default Navbar;
