const nodemailer = require("nodemailer");

const hanldeSendEmail = (
  email,
  emailContent,
  res,
  successMessage = "Vui lòng kiểm tra hòm thư của bạn"
) => {
  const transporter = nodemailer.createTransport({
    // config mail server
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER, //Tài khoản gmail vừa tạo
      pass: process.env.EMAIL_PASSWORD, //Mật khẩu tài khoản gmail vừa tạo
    },
    tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false,
    },
  });
  const mainOptions = {
    // thiết lập đối tượng, nội dung gửi mail
    from: "Booking restaurant",
    to: email,
    subject: "Booking restaurant",
    text: "Booking restaurant",
    html: emailContent,
  };
  transporter.sendMail(mainOptions, function (err, info) {
    if (err) {
      console.log(err);
      res.status(500).send({ message: "Đã có lỗi xảy ra" });
    } else {
      res.status(200).send({ message: successMessage });
    }
  });
};

module.exports = hanldeSendEmail;
