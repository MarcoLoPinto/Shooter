$(function(){	
	
	var socket = io();
	var game = new FitViewport(document.getElementById("ctx"),document.getElementById("ctx").getContext("2d"),(16/9),16,"gray","yellow",window.innerWidth,window.innerHeight);
	
	loadImages(imgs,function(){
		setScreen([],['initHolder']);
		
		window.requestAnimationFrame(drawCoreFunction);
		
		function drawCoreFunction(){
			game.clearCanvasArea(0,0,game.getCanvas().width,game.getCanvas().height,128,128,128,1);
			drawPlayer(loadedimages['player']);
			
			window.requestAnimationFrame(drawCoreFunction);
		}
		
		$( window ).resize(function() {
		  game.resizeCanvas(window.innerWidth,window.innerHeight);
		});
		
	});
	
	//DRAWING FUNCTIONS
	
	function drawPlayer(player){
		game.getContext().save();
		game.getContext().drawImage(player,game.getCanvas().width-game.getDimension(),game.getCanvas().height/2-game.getDimension()/2,game.getDimension(),game.getDimension());
		game.getContext().drawImage(player,game.getCanvas().width/2-game.getDimension(),game.getCanvas().height/2-game.getDimension()/2,game.getDimension(),game.getDimension());
		
		game.getContext().restore();
	}
	
	
	function drawBackground(img,myPlayer) {
		ctx.save();
		var incrementX = cubeSize;
		var incrementY = cubeSize;
		var xMap = (myPlayer.x-canvas.width/2) % incrementX;
		var yMap = (myPlayer.y-canvas.height/2) % incrementY;
		
		ctx.translate(-xMap,-yMap);
		
		ctx.beginPath();
		ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
		for(i=-1;i<(canvas.width+incrementX*2)/incrementX;i++){
			for(j=-1;j<(canvas.height+incrementY*2)/incrementY;j++){
				ctx.drawImage(img,i*incrementX - incrementX/2,j*incrementY - incrementY/2,incrementX,incrementY);
				if( ( ((myPlayer.x-canvas.width/2)+i*cubeSize -xMap < 0) || ((myPlayer.y-canvas.height/2)+j*cubeSize -yMap< 0) )  ||
					( ((myPlayer.x-canvas.width/2)+i*cubeSize -xMap  > cubeSize*mapDimension) || ((myPlayer.y-canvas.height/2)+j*cubeSize -yMap > cubeSize*mapDimension) )  ){
					ctx.fillRect(i*incrementX - incrementX/2,j*incrementY - incrementY/2,incrementX,incrementY);
				}
			}
		}
		ctx.stroke();
		
		ctx.translate(+xMap,+yMap);
		ctx.restore();
	}
	
	
	//CAMERA
	
	function camera(clientPlayer){
		globalX = - clientPlayer.x + canvas.width/2;
		globalY = - clientPlayer.y + canvas.height/2;
		myX = clientPlayer.x;
		myY = clientPlayer.y;
	}
	

});

