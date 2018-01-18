var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer({port: 9090});

var users = {};

wss.on('connection', function(connection){
	console.log("user connected");
	
	connection.on('message', function(message){
		var data;
		try{
			data = JSON.parse(message);
			console.log("data from user   ::    ", data);
		}catch(e){
			console.log("Invalid JSON ");
			data = {};
		}
		
		switch(data.type){
			case "login":
				
				// if anyone logged in with this username the refuse
				if(users[data.name]){
					sendTo(connection, {
						type: "login",
						success: false
					});
				}else{
					console.log("User logged: ", data.name);
					
					// save user connection on the server
					connection.name = data.name;
					users[data.name] = connection;
					
					sendTo(connection, {
						type: "login",
						success: true
					});
				}
				break;
				
			case "offer":
				// for example UserA wants to call UserB
				console.log("Sending offer to: ", data.name);
				console.log("offer from  " + connection.name + "    ::   " + data.name);
				
				// if UserB exists then send him offer details
				var conn = users[data.name];
				if(conn != null){
					// setting that UserA connected with UserB
					connection.otherName = data.name;
					sendTo(conn, {
						type: "offer",
						offer: data.offer,
						name: connection.name
					});
				}
				break;
				
			case "answer":
				console.log("Sending answer to:  ", data.name);
				console.log("asnwer from  " + connection.name + "    ::   " + data.name);
				
				// for example UserB answers UserA
				var conn = users[data.name];
				if(conn != null){
					connection.otherName = data.name;
					sendTo(conn, {
						type: "answer",
						answer: data.answer
					});
				}
				break;
			
			case "candidate":
				console.log("\n\nSending candidate to: ", data.name);
				var conn = users[data.name];
				console.log("Sending from  " + connection.name + "  to  " + conn.name);
				if(conn != null){
					sendTo(conn, {
						type: "candidate",
						candidate: data.candidate
					});
				}
				break;
				
			case "leave":
				console.log("Disconnecting from: ", data.name);
				var conn = users[data.name];
				conn.otherName = null;
				
				// notify the other user so he can disconnect his peer connection
				if(conn != null){
					sendTo(conn, {
						type: "leave"
					});
				}
				break;
				
			default:
				sendTo(connection, {
					type: "error",
					message: "Command not found:  " + data.type
				});
				break;
		}
	});
	
	connection.on("close", function(){
		if(connection.name){
			delete users[connection.name];
			
			if(connection.otherName){
				console.log("Disconnecting from :: ", connection.otherName);
				var conn = users[connection.otherName];
				conn.otherName = null;
				
				if(conn != null){
					sendTo(conn, {
						type: "leave"
					});
				}
			}
		}
	});
	
	connection.send("{ \"message\" : \"Hello user from server\" }");
});

function sendTo(connection, message){
	console.log("sending to  ::  " + connection.name);
	connection.send(JSON.stringify(message));
}