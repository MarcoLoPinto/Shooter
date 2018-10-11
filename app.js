/*
File communication (handled by Express) e.g. client asks for a file
Package communication (handled by Socket.io) e.g. cilent sends data to server (O VICE VERSA)

URL = DOMAIN + PORT + PATH
	(site.com)(:2000)(/client/playerImg.png)
*/
//constant ratio objects
	var cubeSize = 64;

var express = require('express');
var app = express();
var server = require('http').Server(app);

var io = require('socket.io')(server);

var port =  process.env.PORT || 3000;

app.use("/client",express.static(__dirname + "/client"));
 
app.get('/',function(req,res){
	res.sendFile(__dirname + "/client/index.html");
});

server.listen(port, function(){
	console.log('Server on at: '+port);
});

//Socket.io functions

var SocketList = {};

var PlayerList = {};

//Objects

var ObjectList = {}; 

//NEW: direct access function:
//(img,dimension,duration,interaction,z-index) + fac. -> other piece
var objectBuilder = {
					"wood":{img:"wood",dimension:64,duration:6,interaction:2},
					"brick":{img:"brick",dimension:64,duration:8,interaction:2},
					"craft_table":{img:"craft_table",dimension:64,duration:3,interaction:2},
					"door_dark":{img:"door_dark",dimension:64,duration:4,interaction:2},
					"bed_inf":{img:"bed_inf",dimension:64,duration:4,interaction:2,other:"bed_sup"},
					"bed_sup":{img:"bed_sup",dimension:64,duration:4,interaction:2},
					"chest":{img:"chest",dimension:64,duration:6,interaction:2},
					"furnace":{img:"furnace",dimension:64,duration:8,interaction:2}
					};
					
var weaponBuilder = {"[weapon]galactic-wrench":{span:80,radius:cubeSize*2,dmg:2}};
					
//first object in menu & hand:

var firstSelectableObj = ["brick","wood","craft_table","bed_inf","[weapon]galactic-wrench","0void","0void","0void","0void"];
var firstListBox = {"door_dark":"door_dark","chest":"chest","furnace":"furnace"};

//ALL objects that a player has! (firstSelectableObj+firstListBox)

var firstObjList = {"brick":{number:1,handDurability:-1},"wood":{number:1,handDurability:-1},"craft_table":{number:1,handDurability:-1},"bed_inf":{number:1,handDurability:-1},
					"[weapon]galactic-wrench":{number:1,handDurability:-1},"door_dark":{number:1,handDurability:-1},"chest":{number:1,handDurability:-1},"furnace":{number:1,handDurability:-1}};


//Group List generated by players

var groupList = {};
//"DogeAlpoArmy","TheGeekyGeeks","MMOs Before Hoes","Punishers of Uranus","It burns when I PvP","Fat Kids Lag IRL","Yo mama so fat"
					
//INITIALIZATION PHASE
var mapDimension = 20; // 20*cubeSize
var environmentBuilder= {
						"tree":{img:"tree",dimension:"128",duration:-1,howmany:mapDimension/10,drop:[{object:"wood",number:2,handDurability:-1}]}, //TODO
						"stone":{img:"stone",dimension:"128",duration:-1,howmany:0,drop:[{object:"wood",number:2,handDurability:-1}]},
						};


function isEmpty(x,y,blocks){

	for(var i=0;i<blocks;i++){
		for(var j=0;j<blocks;j++){
			if((ObjectList[(x+i*cubeSize)+";"+(y+j*cubeSize)]!=undefined))
				return false;
		}
	}
	return true;
}

function initMap(){
	console.log("INIT MAP with dimension: "+mapDimension);
	for( var o in environmentBuilder){
		var counter;
		for(var index=0;index<environmentBuilder[o].howmany;index++){//(data.x+cubeSize/2) - ((data.x+cubeSize/2)%cubeSize);
			//console.log(index+": "+environmentBuilder[o].howmany);
			counter = 0;
			do{
				var nX = (Math.random()*mapDimension*cubeSize-cubeSize);
				nX = nX - nX%cubeSize;
				var nY = (Math.random()*mapDimension*cubeSize-cubeSize);
				nY = nY - nY%cubeSize;
				//console.log(ObjectList);
				counter++;
			} while(!isEmpty(nX,nY,environmentBuilder[o].dimension/cubeSize) && counter<10);
			
			if(counter==10){
				console.log("ERROR: free space not found for "+environmentBuilder[o].img);
			}
			else console.log(environmentBuilder[o].img+" spawned at corner "+nX+";"+nY);
			
			for(var a=0;a<environmentBuilder[o].dimension/cubeSize;a++){
				for(var b=0;b<environmentBuilder[o].dimension/cubeSize;b++){
					if(a==0&&b==0)
						var createdEnv = new Object(nX,nY,environmentBuilder[o].img,environmentBuilder[o].dimension,environmentBuilder[o].duration,2,0);
					else var createdEnv = new Object(nX +a*cubeSize,nY +b*cubeSize,environmentBuilder[o].img,0,environmentBuilder[o].duration,2,0);
					
					
					ObjectList[ (nX+a*cubeSize)+";"+(nY+b*cubeSize) ].relativeObj = [];
					for(var c=0;c<environmentBuilder[o].dimension/cubeSize;c++){
						for(var d=0;d<environmentBuilder[o].dimension/cubeSize;d++){
							if(ObjectList[ (nX+a*cubeSize)+";"+(nY+b*cubeSize) ] != ObjectList[ (nX+c*cubeSize)+";"+(nY+d*cubeSize)]){
								ObjectList[ (nX+a*cubeSize)+";"+(nY+b*cubeSize) ].relativeObj.push( (nX+c*cubeSize)+";"+(nY+d*cubeSize) );
							}
						}
					}
					
				}
			}
			
		}
	}
	console.log("ALL DONE, starting...");
}


//END INIT PHASE

class Player {

	constructor(x,y,id,dimension,name){
		this.x = x;
		this.y = y;
		this.id=id;
		this.name = name;
		this.squad = undefined; //no groups (squad) at first // groupList[creator.id] = {player1.id:player1.name,...};
		
		this.left=false;
		this.right=false;
		this.up=false;
		this.down=false;
		this.bulletPressingAttack = false;
		this.mouseAngle = 0;
		
		//Player variables/const
		this.speed=5; 
		this.hpMax=10; //static
		this.hp=10;
		
		this.dimension=dimension-6; //REMEMBER!
		
		this.toggleCoolDown=0;
		
		this.knockBack = {time:0};
		
		//SELECTED OBJ!
		this.selectedObj = firstSelectableObj[0];
		
		//Obj list!
		this.objList = JSON.parse(JSON.stringify(firstObjList));
		
		//ADDING PLAYER
		PlayerList[id] = this;
	}
	
	shootBullet(angle){
		var b = new Bullet(this.x,this.y,angle,this.id,cubeSize/3);
		this.toggleCoolDown = Bullet.addFireTimer;
	}
	
	updateSpeed(){
		var decreaseSpd = this.speed;
		var count = 0;
		
		
		if(this.left) count++;
		if(this.right) count++;
		if(this.up) count++;
		if(this.down) count++;
		
		if(count==2) decreaseSpd = this.speed*((Math.sqrt(2))/2);
		
		var CornerObjPos = Object.getNearObj(ObjectList,this.x,this.y);
		
		for(var i in CornerObjPos){
			ObjectList[ CornerObjPos[i] ].collisionHandler(this,decreaseSpd);
		}
		
		if(this.knockBack.time>0){
			this.x -= this.knockBack.time*this.speed*this.knockBack.x/this.knockBack.d;
			this.y -= this.knockBack.time*this.speed*this.knockBack.y/this.knockBack.d;
			this.knockBack.time--;
		}
		
		checkMapBorders(this,decreaseSpd);
		
		if(this.left)
			this.x -= decreaseSpd;
		if(this.right)
			this.x += decreaseSpd;
		if(this.up)
			this.y -= decreaseSpd;
		if(this.down)
			this.y += decreaseSpd;
			
		if(this.bulletPressingAttack && this.toggleCoolDown<=0) 
			this.shootBullet(this.mouseAngle);
		if (this.toggleCoolDown>0)
			this.toggleCoolDown--;
	}
	
	static onConnect(socket,name){
		
		//var selectableObj = ["brick","wood","craft_table","door_dark","bed_inf","[weapon]galactic-wrench","0void","0void","0void"];
		var sx,sy;
		var counter = 0;
		do{
			sx = (Math.random()*mapDimension*cubeSize);
			sx = sx - sx%cubeSize;
			sy = (Math.random()*mapDimension*cubeSize);
			sy = sy - sy%cubeSize;
			counter++;
		} while(!isEmpty(sx,sy,cubeSize) && counter<10);
		console.log("|WARNING| Trying to spawn player, collision found: "+counter);
		
		var player = new Player(sx,sy,socket.id,cubeSize,name);
		
		socket.on('createSquad',function(data){
			if(groupList[player.id]!=undefined) return;
			if( (data == undefined || data == "") ){
				return;
			} else if(data.length >20){
				return;
			}
			console.log('|Squad| '+player.name+'['+player.id+']: creating SquadName: '+data);
			player.squad = player.id; //it's his squad, same id
			var squadCore = {creator:player.id,name:data,players:{[player.id]:player.name},requests:{}}; //requests to join squad!
			groupList[player.id] = squadCore;
			for(var i in PlayerList){
				var socket = SocketList[i];
				socket.emit('joinSquad',squadCore);
			}
			
		});
		
		socket.on('squadRequestHandler',function(data){ // {type:"something",pack:squad}
			switch(data.type){
				case 'joinRequest':
					if(SocketList[data.pack.creator]==undefined || groupList[player.id]!=undefined || data.pack.creator==player.id || groupList[data.pack.creator].requests[player.id]!=undefined || groupList[data.pack.creator].players[player.id]!=undefined) return;
					console.log('|Squad| '+"Request from "+player.name+'['+player.id+']'+" to join "+data.pack.name+" (creator: "+PlayerList[data.pack.creator].name+'['+data.pack.creator+']'+")");
					
					groupList[data.pack.creator].requests[player.id] = player.name;
					
					SocketList[data.pack.creator].emit('squadRequestResponse',{type:data.type,pack:{[player.id]:player.name}});
					break;
					
				case 'acceptedRequest':
					console.log(groupList[player.id].requests[data.pack.id]);
					if(groupList[player.id].requests[data.pack.id]!=undefined && PlayerList[data.pack.id]!=undefined){
						console.log('|Squad| '+"Accepted request from "+player.name+'['+player.id+']'+" to player: "+data.pack.name+'['+data.pack.id+']');
						PlayerList[data.pack.id].squad = player.id; //now he is in the squad
						//console.log(PlayerList[data.pack.id]);
						groupList[player.id].players[data.pack.id] = data.pack.name; //add to players list
						delete groupList[player.id].requests[data.pack.id]; // delete player from requests
						for(var i in PlayerList){
							var socket = SocketList[i];
							socket.emit('squadRequestResponse',{type:data.type,pack:{[data.pack.id]:data.pack.name},creator:player.id});
						}
					}
					break;
					
				case 'deniedRequest':
					console.log('|Squad| '+"Denied request from "+player.name+'['+player.id+']'+" to player: "+data.pack.name+'['+data.pack.id+']');
					delete groupList[player.id].requests[data.pack.id];
					/*
					for(var i in PlayerList){
						var socket = SocketList[i];
						socket.emit('squadRequestResponse',{type:data.type,pack:{[data.pack.id]:data.pack.name},creator:player.id});
					}
					*/
					break;
					
				default:
					break;
			}
		});
		
		socket.on('objInHand', function(data){
			console.log("|InHand| "+player.name+"["+player.id+"]"+" has in hand "+data.object);
			PlayerList[player.id].selectedObj = data.object;
			for(var i in SocketList){
				var socket = SocketList[i];
				socket.emit('someoneObjInHand',{id:player.id,object:data.object});
			}
			
		});
		
		socket.on('keyPress', function(data){
			
			switch(data.inputId){
				case 'left':
					player.left = data.state;
					break;
				case 'right':
					player.right = data.state;
					break;
				case 'up':
					player.up = data.state;
					break;
				case 'down':
					player.down = data.state;
					break;
					
				case 'attack':
					player.bulletPressingAttack = data.state;
					break;
				
				case 'mouseAngle':
					player.mouseAngle = data.state;
					break;
				
				case 'interact': //todo
					if( ObjectList[data.index].interactionChecker(PlayerList[data.id]) ){
						Object.toggleImg(ObjectList[data.index],data.index);
					}
					break;
				
				case 'weapon-attack':
					if(PlayerList[player.id].toggleCoolDown <=0){
						PlayerList[player.id].toggleCoolDown = 18;
						for(var i in SocketList){
							var socket = SocketList[i];
							socket.emit('weapon-attackFrame',{movement:{type:"weapon-attack",init:0,frames:140,id:player.id},into:"player"});
						}
						for(var i in data.players){
							if(isPlayerNear(player.id,data.players[i],data.weapon)){ //!
								PlayerList[data.players[i]].hp-=weaponBuilder[data.weapon].dmg;
								//var playersAngle = Math.atan2((PlayerList[player.id].y-PlayerList[data.players[i]].y), (PlayerList[player.id].x-PlayerList[data.players[i]].x))* 180 / Math.PI;
								
								if(PlayerList[data.players[i]].hp<=0){ //PLAYER DOESN'T DIE, JUST RANDOMICALLY RESPAWN ----------------!--------------------!
									PlayerList[data.players[i]].hp = PlayerList[data.players[i]].hpMax;
									PlayerList[data.players[i]].x = Math.random()*500;
									PlayerList[data.players[i]].y = Math.random()*500;
								}
								else {
									var lx = (PlayerList[player.id].x-PlayerList[data.players[i]].x);
									var ly = (PlayerList[player.id].y-PlayerList[data.players[i]].y);
									var dist = Math.sqrt(Math.pow(lx,2)+Math.pow(ly,2));
									PlayerList[data.players[i]].knockBack = {time:5,x:lx,y:ly,d:dist};
								}
							}
						}
						
						var add = checkBlock(PlayerList[player.id].mouseAngle,player.x,player.y);
						
						if(ObjectList[add.x+";"+add.y]!=undefined){
							if(ObjectList[add.x+";"+add.y].duration!=0){
								//console.log("picchiato");
								if(ObjectList[add.x+";"+add.y].duration>0) ObjectList[add.x+";"+add.y].duration--;
								
								if(ObjectList[add.x+";"+add.y].relativeObj!=undefined && ObjectList[add.x+";"+add.y].relativeObj.length>0){
									for(var ind=0; ind<ObjectList[add.x+";"+add.y].relativeObj.length; ind++){
										ObjectList[ObjectList[add.x+";"+add.y].relativeObj[ind]].duration--;
									}
									socket.emit('weapon-attackFrame',{movement:{type:"object-attack",init:0,frames:16,id:ObjectList[add.x+";"+add.y].relativeObj.concat([(add.x+";"+add.y)]),angle:player.mouseAngle},into:"object"});
								}
								else socket.emit('weapon-attackFrame',{movement:{type:"object-attack",init:0,frames:16,id:[(add.x+";"+add.y)],angle:player.mouseAngle},into:"object"});
								
								if(environmentBuilder[ObjectList[add.x+";"+add.y].img]!=undefined){
									var receive = JSON.parse(JSON.stringify(environmentBuilder[ObjectList[add.x+";"+add.y].img].drop));
									
									//console.log(player.name+" received: ");
									for(var i in receive){
										//console.log("-"+receive[i].object+"("+receive[i].number+")");
										if(player.objList[receive[i].object]==undefined){
											player.objList[receive[i].object] = receive[i];
										}
										else {
											player.objList[receive[i].object].number += receive[i].number;
										}
										receive[i].number = player.objList[receive[i].object].number;
										//console.log("- now player has: "+player.objList[receive[i].object].number);
									}
									
									socket.emit("localObjListListener",receive);
								}
								
								
							}
							
							else if(ObjectList[add.x+";"+add.y].duration==0){
								if(ObjectList[add.x+";"+add.y].relativeObj!=undefined && ObjectList[add.x+";"+add.y].relativeObj.length>0){
									
									socket.emit('replaceObj',{obj:undefined,index:(add.x+";"+add.y),other:ObjectList[add.x+";"+add.y].relativeObj});
									
									delete ObjectList[ObjectList[add.x+";"+add.y].relativeObj];	
								}
								else{
									socket.emit('replaceObj',{obj:undefined,index:(add.x+";"+add.y)});
								}
								delete ObjectList[add.x+";"+add.y];
								
							}
						}
						
					}
					break;
					
				case 'debug':
					var o = new Object(data.x,data.y,"floordoor_opened",cubeSize,-1,0);
				break;
				
				default:
					break;
			}
			
		});
		
		socket.on('buildObj', function(data){
			if(player.objList[data.select]!=undefined && player.objList[data.select].number>0){
				var centeredPx = (player.x+cubeSize/2) - ((player.x+cubeSize/2)%cubeSize);
				var centeredPy = (player.y+cubeSize/2) - ((player.y+cubeSize/2)%cubeSize);
				var angle = 0;
				
				if(data.pos=="up"){
					centeredPy = centeredPy-cubeSize;
					angle = Math.PI;
				}
				else if(data.pos=="down"){
					centeredPy = centeredPy+cubeSize;
				}
				else if(data.pos=="left"){
					centeredPx = centeredPx-cubeSize;
					angle = Math.PI/2;
				}
				else if(data.pos=="right"){
					centeredPx = centeredPx+cubeSize;
					angle = -Math.PI/2;
				}
				else return;
				
				
				if(ObjectList[centeredPx+";"+centeredPy]!=undefined) return;
				if(objectBuilder[data.select] == undefined) return;
				
				
				var createdSecondaryObj;
				
				if(objectBuilder[data.select].other != undefined){ //"bed_inf":{img:"bed_inf",dimension:64,duration:-1,interaction:2,other:"bed_sup"},
					var nX = centeredPx;
					var nY = centeredPy;
					var name = objectBuilder[data.select].other;
					
					if(data.pos=="up"){
						nY = centeredPy-cubeSize;
					}
					else if(data.pos=="down"){
						nY = centeredPy+cubeSize;
					}
					else if(data.pos=="left"){
						nX = centeredPx-cubeSize;
					}
					else if(data.pos=="right"){
						nX = centeredPx+cubeSize;
					}
					else return;
					
					if(ObjectList[nX+";"+nY]!=undefined) return;
					
					createdSecondaryObj = new Object(nX,nY,objectBuilder[name].img,objectBuilder[name].dimension,objectBuilder[name].duration,objectBuilder[name].interaction,angle);
				}
				
				var createdObj = new Object(centeredPx,centeredPy,objectBuilder[data.select].img,objectBuilder[data.select].dimension,objectBuilder[data.select].duration,objectBuilder[data.select].interaction,angle);
				
				if(objectBuilder[data.select].other != undefined){
					createdObj.relativeObj = [];
					createdSecondaryObj.relativeObj = [];
					createdObj.relativeObj.push(createdSecondaryObj.id);
					createdSecondaryObj.relativeObj.push(createdObj.id);
				}
				player.objList[data.select].number--;
				if(player.objList[data.select].number==0) player.selectedObj = "0void";
				socket.emit("localObjListListener",[{object:data.select,number:player.objList[data.select].number,handDurability:-1}]); //array of objects
			}
		});
		
	}
	
	static onDisconnect(socket){
		for(var i in PlayerList){
			var s = SocketList[i];
			s.emit('joinSquad',{creator:socket.id,players:{}});
		}
		
		if(PlayerList[socket.id]!=undefined && PlayerList[socket.id].squad!=undefined){
			
			if(groupList[socket.id]!=undefined){
				for(var p in groupList[PlayerList[socket.id].squad].players){
					PlayerList[p].squad = undefined;
				}
				delete groupList[socket.id];
			} else {
				console.log("|Disconnection(Squad)| removing player from group: "+groupList[PlayerList[socket.id].squad].players[socket.id]+"["+socket.id+"]");
				delete groupList[PlayerList[socket.id].squad].players[socket.id];
			}
		}
		delete PlayerList[socket.id];
		delete SocketList[socket.id];
		//console.log(groupList);
	}
	
	static generalUpdate(){
		var pack = {};
		for(var i in PlayerList){
			var player = PlayerList[i];
			player.updateSpeed();
			var singlePack = ({
				x:player.x,
				y:player.y,
				name:player.name, //toremove?
				hpMax:player.hpMax,
				hp:player.hp,
				mouseAngle:player.mouseAngle,
				id:player.id,
				selectedObj:player.selectedObj,
				squad:player.squad,
			});
			pack[player.id] = singlePack;
			
			//RESET FUNCTIONS!!! e.g. animations			
		}
		return pack;
	} 
	
	
}

BulletList = {};

class Bullet {

	constructor(x,y,angle,parent,dimension){
		this.x = x;
		this.y = y;
		this.id = Math.random();
		this.parent = parent;
		this.number="" + Math.floor(10*Math.random());
		this.spdX = Math.cos(angle/180*Math.PI) * 20;
		this.spdY = Math.sin(angle/180*Math.PI) * 20;
		this.timer = 0;
		this.dimension = dimension;
		
		//ADDING BULLET
		BulletList[this.id] = this;
	}
	
	destroyInstance(){
		delete BulletList[this.id];
	}
	
	getDistance(obj){
		return Math.sqrt( Math.pow(this.x-obj.x,2) + Math.pow(this.y-obj.y,2) );
	}
	
	collisionHandler(){
		for(var i in PlayerList){
			var p = PlayerList[i];
			if(this.getDistance(p) < 32 && this.parent !== p.id){
				//handle collision
				p.hp -= 1;
				if(p.hp<=0){ //PLAYER DOESN'T DIE, JUST RANDOMICALLY RESPAWN ----------------!--------------------!
					p.hp = p.hpMax;
					p.x = Math.random()*500;
					p.y = Math.random()*500;
				}
				this.toRemove = true;
			}
		}
	}
	
	updatePosition(){
		if(this.timer++>100)
			this.destroyInstance();
		else{
			for(var i in ObjectList){
				ObjectList[i].collisionHandler(this);
			}
			this.x += this.spdX;
			this.y += this.spdY;
			
			this.collisionHandler();
		}
	}
	
	static generalUpdate(){
		var pack = [];
		for(var i in BulletList){
			var bullet = BulletList[i];
			bullet.updatePosition();
			if(bullet.toRemove)
				delete BulletList[i];
			else{
				pack.push({
					x:bullet.x,
					y:bullet.y,
					dimension:bullet.dimension,
				});
			}
		}
		return pack;
	}
	
	
	//static getAngle(player,mouseX,mouseY){
	//	var x = canvas.width / 2 + mouseX;
	//	var y = canvas.height / 2 + mouseY;
	//}
	
}
//BULLET CONSTANTS
Bullet.addFireTimer = 24; //constant


class Object{
	constructor(x,y,img,dimension,duration,interaction,direction){
		this.x = x;
		this.y = y;
		this.img = img;
		this.duration = duration; //  |-1=indestructible|n>0=destructible|
		this.interaction = interaction; //0 is default, is for "closed", 1 is for open door (if it's floor, with 0 you can't walk), 2 no-interact(solid), 3 no-interact(no collision)
		this.dimension = dimension;
		this.direction = direction; //placed up,down.. relatively to player
		this.id = x+";"+y;
		
		//ADDING OBJECT
		ObjectList[this.id] = this;
		//EMITTING OBJECT
		Object.emit(this);
	}
	
	interactionChecker(p){ //this.dimension=cubeSize here!
		if(this.interaction != 3){
			if( Math.abs((p.x-this.x))<(p.dimension/2 + cubeSize/2) ){
				if((p.x-this.x)>0 &&  Math.abs((p.y-this.y))<(p.dimension/2 + cubeSize/2)){
					return true;
				}
				else if((p.x-this.x)<0 &&  Math.abs((p.y-this.y))<(p.dimension/2 + cubeSize/2)){
					return true;
				}
			}
			if( Math.abs((p.y-this.y))<(p.dimension/2 + cubeSize/2)){
				if( (p.y-this.y)>0 && Math.abs((p.x-this.x))<(p.dimension/2 + cubeSize/2)){
					return true;
				}
				else if((p.y-this.y)<0 && Math.abs((p.x-this.x))<(p.dimension/2 + cubeSize/2)){
					return true;
				}
			}
		}
		return false;
	}
	
	collisionHandler(p,speed){
		if(this.interaction==0 || this.interaction==2){
			if(p instanceof Player && this.interactionChecker(p)){
				var angle = Math.atan2(p.y - this.y, p.x - this.x)* 180 / Math.PI;
				if(angle>=-45 && angle<45){
					p.x+=speed;
				}
				else if(angle>=45 && angle<135){
					p.y+=speed;
				}
				else if( (angle>=135 && angle<=180) || (angle<-135 && angle>=-180) ){
					p.x-=speed;
				}
				else if(angle>=-135 && angle<-45){
					p.y-=speed;
				}
			}
			else if (p instanceof Bullet && (this.interaction != 1 && this.interaction != 3) && this.interactionChecker(p)){
				p.destroyInstance();
			}
		}
		
	}
	
	static emit(obj){
		for(var i in SocketList){
			var socket = SocketList[i];
			socket.emit('newObj',obj);
		}
	}
	
	static toggleImg(obj,index){
		if(obj.img == "floordoor_opened") obj.img = "floordoor";
		else if(obj.img == "floordoor") obj.img = "floordoor_opened";
		
		if(obj.interaction==0) obj.interaction=1;
		else obj.interaction=0;
		
		for(var i in SocketList){
			var socket = SocketList[i];
			socket.emit('replaceObj',{obj:obj,index:index});
		}
	}
	
	static getNearObj(ObjList,px,py){
		var newX = px - (px%cubeSize);
		var newY = py - (py%cubeSize);
		var arr = [];
		for(var i=-1;i<2;i++){
			for(var j=-1;j<2;j++){
				var cubePosX = newX + i*cubeSize;
				var cubePosY = newY + j*cubeSize;
				if(ObjList[cubePosX+";"+cubePosY]!=undefined) arr.push(cubePosX+";"+cubePosY);
			}
		}
		return arr;
	}
}

//TODO-MAP CONTROLS

function checkMapBorders(player,speed){
	if(player.x <= 0){
		player.x+=speed;
	}
	else if(player.x>=mapDimension*cubeSize){
		player.x-=speed;
	}
	
	if(player.y <= 0){
		player.y+=speed;
	}
	else if(player.y>=mapDimension*cubeSize){
		player.y-=speed;
	}
}


//COLLISION CHECKER!

function checkBlock(angle,px,py){
	var newX = (px+cubeSize/2) - ((px+cubeSize/2)%cubeSize);
	var newY = (py+cubeSize/2) - ((py+cubeSize/2)%cubeSize);
	if(angle>=45 && angle<=135)
		newY +=cubeSize;
	else if(angle<=-45 && angle>=-135)
		newY -=cubeSize;
	else if(angle>-45 && angle<45)
		newX +=cubeSize;
	else newX -=cubeSize;
	
	return {x:newX,y:newY};
}

function from180to360(angle){
	var retangle = angle;
	if(angle < 0){
		retangle = 180 + (180+angle);
	}
	return retangle;
}

function isPlayerNear(p1,p2,weapon){ //PlayerList[data.players[i]]
	var dist = Math.sqrt( Math.pow(PlayerList[p1].x-PlayerList[p2].x,2) + Math.pow(PlayerList[p1].y-PlayerList[p2].y,2) );
	if(dist<=weaponBuilder[weapon].radius){
		var playersAngle = Math.atan2(-(PlayerList[p1].y-PlayerList[p2].y), -(PlayerList[p1].x-PlayerList[p2].x))* 180 / Math.PI;
		//console.log(checkPositionAngle(playersAngle)+" and "+checkPositionAngle(PlayerList[p1].mouseAngle));
		var plAngle = from180to360(PlayerList[p1].mouseAngle);
		playersAngle = from180to360(playersAngle);
		
		if( plAngle<=playersAngle+weaponBuilder[weapon].span && plAngle>=playersAngle-weaponBuilder[weapon].span )
			return true;
		else return false;
	} else return false;
}


/*
if(p instanceof Player){
				if( Math.abs((p.x-this.x))<(p.dimension/2 + this.dimension/2) ){
					if((p.x-this.x)>0 &&  Math.abs((p.y-this.y))<(p.dimension/2 + this.dimension/2) && p.left){
						//p.left = false;
						p.x+=speed;
					}
					else if((p.x-this.x)<0 &&  Math.abs((p.y-this.y))<(p.dimension/2 + this.dimension/2) && p.right){
						//p.right = false;
						p.x-=speed;
					}
				}
				if( Math.abs((p.y-this.y))<(p.dimension/2 + this.dimension/2)){
					if( (p.y-this.y)>0 && Math.abs((p.x-this.x))<(p.dimension/2 + this.dimension/2) && p.up){
						//p.up = false;
						p.y+=speed;
						if(p.left)
							p.x-=speed;
						else if(p.right)
							p.x+=speed;
					}
					else if((p.y-this.y)<0 && Math.abs((p.x-this.x))<(p.dimension/2 + this.dimension/2) && p.down){
						//p.down = false;
						p.y-=speed;
						if(p.left)
							p.x-=speed;
						else if(p.right)
							p.x+=speed;
					}
				}
			}
*/
//before connections

initMap();

io.on('connection', function(socket){
	
	socket.id = Math.random();
	SocketList[socket.id] = socket;
	console.log(socket.id+' -> New User');
	
	socket.on('playerName',function(data){
		if(PlayerList[socket.id]!=undefined) return;
		if( (data == undefined || data == "") ){
			data = "someone";
		} else if(data.length >15){
			data = "A dirty geek";
		}
		console.log('Player id: '+socket.id+' logging as -> '+data);
		
		Player.onConnect(socket,data);
		
		var initPack = {
			player:PlayerList,
			bullet:BulletList,
			obj:ObjectList,
			id:socket.id,
			//listBox:firstListBox,
			selectableObj:firstSelectableObj,
			mapDimension:mapDimension,
			weaponList:weaponBuilder,
			possessingObj:firstObjList,
			groups:groupList,
		}
		
		socket.emit('initMyId',initPack);
	});
	
	
	socket.on('disconnect', function(){
		console.log(socket.id+' -> Disconnected');
		//delete SocketList[socket.id];
		Player.onDisconnect(socket);
	});
	
	socket.on('socketMessage',function(data){
		if( !(data.msg == "" || data.msg == undefined || data.id == undefined) && data.msg.length < 61 ){
			for(var i in SocketList){
				var socket = SocketList[i];
				socket.emit('serverMessage',data);
			}
		}
	});
	
});

setInterval(function(){
	var pack = {
		player:Player.generalUpdate(),
		bullet:Bullet.generalUpdate()
	}
		
	for(var i in PlayerList){
		var socket = SocketList[i];
		socket.emit('newPositions',pack);
	}
},1000/25);

//------------