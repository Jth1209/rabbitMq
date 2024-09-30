const amqp = require('amqplib');

const amqpURL = 'amqp://guest:guest@localhost:5672';

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