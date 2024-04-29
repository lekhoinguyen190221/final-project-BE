const getMessage = () => {
  const customerBooking = (username, restaurantName, date, time, people) => `
    <h2>Thân ái, ${username}</h2>
    <p>Bạn đã đặt bàn thành công.</p>
    <h3>Thông tin đặt bàn:</h3>
    <table style="width: 400px">
        <tr><td>Nhà hàng:</td><td style="text-align: right">${restaurantName}</td></tr>
        <tr><td>Ngày đặt:</td><td style="text-align: right">${date}</td></tr>
        <tr><td>Giờ đặt:</td><td style="text-align: right">${time}</td></tr>
        <tr><td>Số người:</td><td style="text-align: right">${people}</td></tr>
    </table>
    <p>Hãy tận hưởng thời gian tại nhà hàng!</p>
    <p>Cảm ơn bạn đã đặt bàn!</p>
    `;

  const managerBooking = (username, restaurantName, date, time, people) => `
  <h2>Xin chào, ${username}</h2>
  <p>Đã có người đặt bàn ở nhà hàng của bạn.</p>
  <h3>Thông tin đặt bàn:</h3>
  <table style="width: 400px">
      <tr><td>Nhà hàng:</td><td style="text-align: right">${restaurantName}</td></tr>
      <tr><td>Ngày đặt:</td><td style="text-align: right">${date}</td></tr>
      <tr><td>Giờ đặt:</td><td style="text-align: right">${time}</td></tr>
      <tr><td>Số người:</td><td style="text-align: right">${people}</td></tr>
  </table>
  <p>Vui lòng kiểm tra và xác nhận!</p>
  `;
  const register = (email, token) =>
    `<h6>Đăng ký tài khoản thành công!</h6><p>Vui lòng xác nhận tài khoản của bạn:</p><a href="http://localhost:3000/confirm-user?email=${email}&token=${token}">Xác nhận tài khoản</a>`;
  const changePassword = (email, token) =>
    `<p>Vui lòng ấn vào link dưới để đổi mật khẩu cho tài khoản của bạn:</p><a href="http://localhost:3000/reset-password?email=${email}&token=${token}">Thay đổi mật khẩu</a>`;
  return {
    customerBooking,
    managerBooking,
    register,
    changePassword,
  };
};

module.exports = getMessage;
