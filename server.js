const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("."));

let players = {};

const WEAPONS = {
  ak: { damage: 10, delay: 120 },
  sniper: { damage: 60, delay: 900 },
  shotgun: { damage: 25, pellets: 5, spread: 0.2, delay: 700 }
};

io.on("connection", (socket) => {
  players[socket.id] = {
    x: 0, y: 1, z: 0,
    hp: 100,
    skin: 0xff0000,
    weapon: "ak"
  };

  socket.emit("init", players);

  socket.broadcast.emit("newPlayer", { id: socket.id, data: players[socket.id] });

  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].z = data.z;
      socket.broadcast.emit("move", { id: socket.id, data });
    }
  });

  socket.on("shoot", (data) => {
    const shooter = players[socket.id];
    if (!shooter) return;

    const weapon = WEAPONS[shooter.weapon];

    for (let targetId in players) {
      if (targetId === socket.id) continue;

      let t = players[targetId];

      const dx = t.x - data.x;
      const dz = t.z - data.z;
      const dist = Math.sqrt(dx*dx + dz*dz);

      if (dist < 2.5) {
        t.hp -= weapon.damage;

        io.emit("hit", {
          id: targetId,
          hp: t.hp
        });

        if (t.hp <= 0) {
          io.emit("death", targetId);
          t.hp = 100;
          t.x = 0;
          t.z = 0;
        }
      }
    }
  });

  socket.on("weaponChange", (w) => {
    if (players[socket.id]) {
      players[socket.id].weapon = w;
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("remove", socket.id);
  });
});

http.listen(3000, () => console.log("Running http://localhost:3000"));
