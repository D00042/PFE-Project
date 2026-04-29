import { useState } from "react";

const API = "http://127.0.0.1:8000";

export default function ForgotPassword(){

  const [email,setEmail] = useState("");
  const [msg,setMsg] = useState("");

  //Send reset email request to the backend
  const sendReset = async () => {
    const res = await fetch(`${API}/auth/forgot-password`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({email})
    });

    const data = await res.json();

    setMsg(data.message || data.detail);
  };

  return(
    <div style={{padding:"40px"}}>

      <h2>Forgot Password</h2>

      <input
      placeholder="Enter your email"
      onChange={(e)=>setEmail(e.target.value)}
      />

      <br/><br/>

      <button onClick={sendReset}>
        Send reset email
      </button>

      <p>{msg}</p>

    </div>
  );
}