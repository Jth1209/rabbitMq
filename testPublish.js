const amqp = require('amqplib');

const amqpURL = 'amqp://guest:guest@localhost:5672';

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

sendMessage();