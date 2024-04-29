const mysql = require("mysql2/promise");

const connect = async () => {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "restaurantBookingDB",
  });
  // connection.connect();
  return connection;
};
const disconnect = async () => {
  const useConnect = await connect();
  await useConnect.end();
};

module.exports = {
  connect,
  disconnect,
};
