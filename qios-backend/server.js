const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all connections for simplicity
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve the static HTML files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// --- Back Office State ---
let connectedNodes = new Map();
let adminSockets = new Set();
let systemStats = {
    traceability: 101,
    contradiction: 599,
    // ... other stats
};

// --- Main Server Logic ---
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Differentiate between Admins and Nodes
    socket.on('register_admin', () => {
        console.log(`Admin UI registered: ${socket.id}`);
        adminSockets.add(socket.id);
        socket.join('admins');
        socket.emit('initial_state', { message: "Connected to Back Office as Admin." });
    });

    socket.on('register_node', () => {
        console.log(`Quantum Node registered: ${socket.id}`);
        connectedNodes.set(socket.id, { id: socket.id, particles: [] });
        socket.join('nodes');
        socket.emit('log_message', { message: `Registered with Back Office. Ready for commands.` });
    });

    // Handle program execution requests from nodes
    socket.on('run_program', (data) => {
        console.log(`Received program from node ${socket.id}`);
        // In a real system, you'd parse data.code here.
        // For now, we simulate the orchestration of the example code.
        const nodeList = Array.from(connectedNodes.keys());
        if (nodeList.length < 2) {
            io.to(socket.id).emit('log_message', { type: 'error', message: 'Error: At least 2 nodes must be connected to run this protocol.' });
            return;
        }
        const aliceNodeId = socket.id;
        const bobNodeId = nodeList.find(id => id !== aliceNodeId);

        io.to(aliceNodeId).emit('log_message', { type: 'warn', message: 'Orchestrator: Creating particle alice_q1 on your node.' });
        io.to(bobNodeId).emit('log_message', { type: 'warn', message: 'Orchestrator: Creating particle bob_q1 on your node.' });
        
        // Simulate orchestration delay
        setTimeout(() => {
             io.to(aliceNodeId).emit('execute_command', { command: 'apply_hadamard', target: 'alice_q1'});
        }, 1000);
        
         setTimeout(() => {
            io.to(aliceNodeId).emit('log_message', { type: 'warn', message: 'Orchestrator: Initiating CNOT between your alice_q1 and bob_q1...' });
            io.to(bobNodeId).emit('log_message', { type: 'warn', message: 'Orchestrator: Receiving CNOT from another node...' });
        }, 2000);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        connectedNodes.delete(socket.id);
        adminSockets.delete(socket.id);
    });
});

// --- Continuous Simulation Loop for Admin Panel ---
setInterval(() => {
    // Update stats (as in the previous Admin Panel mockups)
    systemStats.traceability += Math.random() * 2 - 1;
    systemStats.contradiction += Math.random() * 4 - 2;

    const updatePayload = {
        stats: systemStats,
        nodeCount: connectedNodes.size
    };

    // Broadcast the update to all connected admin panels
    io.to('admins').emit('system_update', updatePayload);
}, 2500);


server.listen(PORT, () => {
    console.log(`QIOS Back Office is running on http://localhost:${PORT}`);
});