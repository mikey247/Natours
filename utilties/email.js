const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  //1) create a transporter
  const transporter = nodemailer.createTransport({
    // service: 'Gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  //2) Define the email options
  const mailOptions = {
    from: 'Mikey from Natours',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  //3) Send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
