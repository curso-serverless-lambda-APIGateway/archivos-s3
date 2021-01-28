# Subida de archivos a S3 con Lambdas dentro de VPC y Subnets utilizando Endpoints

  1. [Crear profiles y asignarlos en serverless](#profiles)
  2. [Dependencias necesarias](#dependencies)
  3. [Configurar serverless.yml](#serverlessCfg)
  4. [Configurar app con Express y serverless-http](#handlerCfg)
  5. [Función Upload](#upload)

<hr>

<a name="profiles"></a>

## 1. Crear profiles y asignarlos en serverless

Es posible ahorrarnos el paso de establecer manualmente los datos de acceso a AWS para hacer los deploys. Podemos asignar un profile que tengamos establecido en *~/.aws/credentials* y asociarlo directamente en el archivo **serverless.yml** bajo el apartado *provider*.

~~~
provider:
  name: aws
  runtime: nodejs12.x
  profile: curso-sls
~~~

<hr>

<a name="dependencies"></a>

## 2. Dependencias necesarias

Para este proyecto instalaremos las siguientes dependencias:
  - aws-sdk **->** Lo usaremos para poder subir archivos a S3
  - express **->** Lo usaremos para crear las rutas dinámicas
  - multer **->** Este paquete y el siguiente lo usaremos para subir archivos a través de nodeJS
  - multer-s3
  - serverless-apigw-binary **->** Lo utilizaremos para decirle a ApiGateway que queremos permitir las transmisión de archivos binarios
  - serverless-http **->** Lo utilizaremos para hacer de puente entre serverless y nuestra aplicación

`npm i aws-sdk express multer multer-s3 serverless-apigw-binary serverless-http`

<hr>

<a name="serverlessCfg"></a>

## 3. Configurar serverless.yml

Lo primero que tenemos que hacer es crear el bucket de s3 a través de la consola de AWS (curso-sls-dev).

Dentro del archivo **serverless.yml** añadimos lo siguente:

  - Una nueva entrada *custom* donde se definirá el bucket s3 y el tipo de archivos que podrán subirse:

~~~
custom:
  bucket: curso-sls
  default_stage: dev
  apigwBinary:
    types:
      - '*/*'
~~~

  - Una nueva entrada *plugins* donde definimos el plugin de ApiGateway

~~~
plugins:
  - serverless-apigw-binary
~~~

  - En la entrada *provider* añadimos una línea para definir el stage cuando hagamos el deploy

~~~
provider:
  name: aws
  runtime: nodejs12.x
  profile: curso-sls
  stage: ${opt:stage, self:custom.default_stage}
~~~

  - En las funciones donde sea necesario acceder al bucket, estableceremos una entrada *environment* que tomará el valor que asignamos en la entrada *custom* como se muestra:

~~~
functions:
  uploadS3File:
    handler: handler.app
    environment:
      bucket: ${self:custom.bucket}-${self:provider.stage}
    events:
     - http:
         path: /upload
         method: post
~~~

<hr>

<a name="handlerCfg"></a>

## 4. Configurar app con Express y serverless-http

  1. Creamos las constantes necesarias en el archivo **handler.js**

~~~
const serverless = require('serverless-http');
const express = require('express');
const app = express();
const AWS = require('aws-sdk');
const s3 = new AWS.S3()
const multer = require('multer');
const multerS3 = require('multer-s3')
~~~

  2. Creamos nuestro primer end-point de prueba:

~~~
app.post('/upload', (req, res) => {
  res.send('todo ok')
});
~~~

  3. Exportamos la app

~~~
module.exports.app = serverless(app);
~~~

<hr>

<a name="upload"></a>

## 5. Función para la subida de archivos

  1. Configuramos la constante upload que establecerá el bucket donde se guardará el archivo y el nombre del archivo subido
  
~~~
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
~~~

  2. Definimos la función que enviará el archivo a s3

~~~
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
~~~

  3. Debemos asignar al role que establece los permisos a la función lambda un permiso que le habilite a escribir en s3, a través de la consola de AWS.
