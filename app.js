require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Endpoint to handle the IVR call
app.post('/ivr', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // twiml.play(process.env.AUDIO_URL);
    twiml.play('https://api.twilio.com/cowbell.mp3');
    twiml.gather({
        input: 'dtmf',
        timeout: 5,
        numDigits: 1,
        action: '/handle-gather',
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

// Endpoint to handle the user's input (1 or 2)
app.post('/handle-gather', (req, res) => {
    const digit = req.body.Digits;
    const twiml = new twilio.twiml.VoiceResponse();

    if (digit == '1') {
        // Send a personalized interview link
        twiml.say('Thank you for your interest. A personalized interview link has been sent to you.');
        twilioClient.messages.create({
            body: `Here is your personalized interview link: ${process.env.PERSONALIZED_LINK}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: req.body.From // Recipient's phone number
        }).then(message => console.log(`Message sent with SID: ${message.sid}`))
        .catch(err => console.error(err));
    } else if (digit == '2') {
        // User is not interested
        twiml.say('Thank you for your time. Have a great day.');
    } else {
        // Invalid input
        twiml.say('Sorry, I did not understand your input.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

// Endpoint to trigger the IVR call
app.post('/call', (req, res) => {
    console.log('Request body:', req.body);
    const { to, name } = req.body;
    

    if (!to) {
        return res.status(400).send('Missing "to" parameter.');
    }

    const ivrUrl = `http://abcd1234.ngrok.io/ivr?name=${encodeURIComponent(name)}`;



    twilioClient.calls.create({
        url: ivrUrl,
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
    }).then(call => {
        console.log(`Call initiated with SID: ${call.sid}`);
        res.status(200).send('Call initiated.');
    }).catch(err => {
        console.error(err);
        res.status(500).send('Failed to initiate call.');
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
