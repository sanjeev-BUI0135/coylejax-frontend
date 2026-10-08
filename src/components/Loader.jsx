import React from "react";

const Loader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="relative w-14 h-14">
      <div className="absolute inset-0 rounded-full border-4 border-gray-200"/>
      <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  </div>
);

export default Loader;
