const mongoclient = require("mongodb").MongoClient;
const ObjId = require("mongodb").ObjectId;
const url =
  "mongodb://localhost:27017/mondb";
let mydb;
const amqp = require('amqplib');

const amqpURL = 'amqp://guest:guest@localhost:5672';
mongoclient
  .connect(url)
  .then((client) => {
    mydb = client.db("myboard");
    // mydb.collection('post').find().toArray().then(result =>{
    //     console.log(result);
    // })

    app.listen(8082, function () {
      console.log("포트 8082으로 서버 대기중 ... ");
    });
  })
  .catch((err) => {
    console.log(err);
  });

// MySQL + nodejs 접속 코드
// var mysql = require("mysql");
// var conn = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "123456",
//   database: "myboard",
// });

// conn.connect();

const express = require("express");
const app = express();

//body-parser 라이브러리 추가
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));//요소에 입력한 값을 받아오기 위해 필요함.
app.set("view engine", "ejs");
//정적 파일 라이브러리 추가
app.use(express.static("public"));

app.get("/book", function (req, res) {
  res.send("도서 목록 관련 페이지입니다.");
});
app.get("/", function (req, res) {
  res.render("index.ejs");
});
app.get("/list", function (req, res) {
  //몽고DB에서 데이터 가져오기
  //   conn.query("select * from post", function (err, rows, fields) {
  //     if (err) throw err;
  //     console.log(rows);
  //   });
  mydb
    .collection("post")
    .find()
    .toArray()
    .then((result) => {
      console.log(result);
      res.render("list.ejs", { data: result });
    });
});

//'/enter' 요청에 대한 처리 루틴
app.get("/enter", function (req, res) {
  // res.sendFile(__dirname + '/enter.html');
  res.render("enter.ejs");
});

//'/save' 요청에 대한 post 방식의 처리 루틴
app.post("/save", function (req, res) {
  console.log(req.body.title);
  console.log(req.body.content);
  const msg = {
    title: req.body.title,
    content: req.body.content,
    date: req.body.someDate
  }
  //몽고DB에 데이터 저장하기
  // mydb.collection('post').insertOne(
  //     {title : req.body.title, content : req.body.content},
  //     function(err, result){
  //         console.log(err);
  //         console.log(result);
  //         console.log('데이터 추가 성공');
  //     });
  const sendMessage = async () => {
    const connection = await amqp.connect(amqpURL);
    const channel = await connection.createConfirmChannel();
    let counter = 1;
  
    publishToChannel(channel, {
      routingKey: 'GoodBye',
      exchangeName: 'MyTest',
      data: { Message: msg },
    });
  };
  sendMessage();
  
  mydb
    .collection("post")
    .insertOne({
      title: req.body.title,
      content: req.body.content,
      date: req.body.someDate,
    })
    .then((result) => {
      console.log(result);
      console.log("데이터 추가 성공");
    });

  // let sql = "insert into post (title, content, created) values(?, ?, NOW())";
  // let params = [req.body.title, req.body.content];
  // conn.query(sql, params, function (err, result) {
  //     if (err) throw err;
  //     console.log('데이터 추가 성공');
  // });
  res.redirect("/list");
});

app.post("/delete", function (req, res) {
  console.log(req.body);
  req.body._id = new ObjId(req.body._id);
  mydb
    .collection("post")
    .deleteOne(req.body)
    .then((result) => {
      console.log("삭제완료");
      res.status(200).send();
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send();
    });
});

//'/content' 요청에 대한 처리 루틴
app.get("/content/:id", function (req, res) {
  console.log(req.params.id);
  req.params.id = new ObjId(req.params.id);
  mydb
    .collection("post")
    .findOne({ _id: req.params.id })
    .then((result) => {
      console.log(result);
      res.render("content.ejs", { data: result });
    });
});

//'/edit' 요청에 대한 처리 루틴
app.get('/edit/:id', function (req, res) {
  req.params.id = new ObjId(req.params.id);
  mydb
    .collection("post")
    .findOne({ _id: req.params.id })
    .then((result) => {
      console.log(result);
      res.render("edit.ejs", { data: result });
    });
});

app.post("/edit", function (req, res) {
  console.log(req.body);
  req.body.id = new ObjId(req.body.id);
  mydb
    .collection("post")
    .updateOne({ _id: req.body.id }, { $set: { title: req.body.title, content: req.body.content, date: req.body.someDate } })
    .then((result) => {
      console.log("수정완료");
      res.redirect('/list');
    })
    .catch((err) => {
      console.log(err);
    });
});

const publishToChannel = (channel, { routingKey, exchangeName, data }) => {
  return new Promise((resolve, reject) => {
      //1. Publish할 때는 Exchange이름, RoutingKey를 넣어주고.
      channel.publish(exchangeName, routingKey,

          // 2. 메시지를 보낼때는 직렬화 후 버퍼에 담아서.      
          Buffer.from(JSON.stringify(data), 'utf-8'),

          // 3. 설정 후
          { persistent: true },

          // 4. 메시지 보낸 이후 Promise return
          (err, ok) => {
              if (err) {
                  return reject(err);
              }
              resolve();
          }
      );
  });
};

const sendMessage = async () => {
  const connection = await amqp.connect(amqpURL);
  const channel = await connection.createConfirmChannel();
  let counter = 1;

  publishToChannel(channel, {
    routingKey: 'GoodBye',
    exchangeName: 'MyTest',
    data: { Message: msg },
  });
};

const listenForMessages = async ()=>{
  //채널을 연결
  const connection = await amqp.connect(amqpURL);
  const channel = await connection.createChannel();
  await channel.prefetch(1);

  await consume({connection, channel});
}

const consume =  ({connection, channel}) =>{
  return new Promise((resolve, reject)=>{
      // 원하는 Queue의 이름을 적어준다.
      channel.consume('MyTestRabbit',async (msg)=>{
          // 1. 받은 메시지를 파싱하고.
          const msgBody = msg.content.toString();
          const data = JSON.parse(msgBody);

          // 1-1. 뭘 받았는지 출력해보자.
          console.log('Received Data : ',data);

          // 2. 잘 받았으니 ACK를 보내자.
          await channel.ack(msg);
      })

      // Queue가 닫혔거나. 에러가 발생하면 reject
      connection.on('close',(err)=>{
          return reject(err);            
      })

      connection.on('error',(err)=>{
          return reject(err);            
      })
  })
}

listenForMessages();