const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("."));

let players = {};

io.on("connection", (socket) => {

  players[socket.id] = {
    x: 0,
    y: 0,
    z: 0,
    hp: 100,
    weapon: "ak"
  };

  socket.emit("init", players);
  socket.broadcast.emit("spawn", { id: socket.id, data: players[socket.id] });

  socket.on("move", (data) => {
    if (!players[socket.id]) return;

    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    players[socket.id].z = data.z;

    socket.broadcast.emit("move", { id: socket.id, data });
  });

  socket.on("weapon", (w) => {
    if (players[socket.id]) {
      players[socket.id].weapon = w;
    }
  });

  socket.on("shoot", (data) => {
    let shooter = players[socket.id];
    if (!shooter) return;

    for (let id in players) {
      if (id === socket.id) continue;

      let p = players[id];

      let dx = p.x - data.x;
      let dz = p.z - data.z;

      let dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 3) {
        p.hp -= shooter.weapon === "sniper" ? 60 :
                shooter.weapon === "shotgun" ? 25 : 10;

        io.emit("hit", { id, hp: p.hp });

        if (p.hp <= 0) {
          p.hp = 100;
          p.x = 0;
          p.z = 0;

          io.emit("death", id);
        }
      }
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("remove", socket.id);
  });
});

http.listen(3000, () => console.log("Server running"));
