// import express from "express" 
const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})
app.get('/FreeFire', (req, res) => {
    res.send('Divyanshu Pro hai')
})
app.get('/login', (req, res) => {
    res.send('<h1>login on chai aur code</h1>')
})
app.get('/youtube',(req,res)=>{
    res.send('<h2>Soul Gaming FF</h2>')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})