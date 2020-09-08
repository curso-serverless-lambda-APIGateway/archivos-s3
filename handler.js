'use strict';

const serverless = require('serverless-http')
const express = require('express')
const app = express()
const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const multer = require('multer')
const multerS3 = require('multer-s3')

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.bucket,
    key: (req, file, cb) => {
      const fileExtension = file.originalname.split('.')[1]
      cb(null, `${Date.now().toString()}.${fileExtension}`)
    }
  })
}).single('photo')

app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.send('Error', err).status(500)
    } else {
      console.log(req.body)
      res.send('Archivo subido correctamente').status(200)
    }
  })
})

module.exports.app = serverless(app)