class FitViewport {
	constructor(canvas,ctx,ratio,tilesW,foregroundColor,backgroundColor,initWidth,initHeight){ //tilesW = # of squares that the width of the canvas is divided (used to resize objects)
		this.ctx = ctx;
		this.canvas = canvas;
		this.ratio = ratio;
		this.unit = tilesW;
		this.foregroundColor = foregroundColor;
		this.backgroundColor = backgroundColor;
		if(backgroundColor != "none") document.body.style.backgroundColor = backgroundColor;
		
		if(typeof this.ctx.viewport === 'undefined' && typeof this.ctx.arc !== 'undefined'){ //if is canvas
			this.ctx.mozImageSmoothingEnabled = false;  // firefox
			this.ctx.imageSmoothingEnabled = false;
		}
		this.resizeCanvas(initWidth,initHeight); //init dimensions
	}
	
	resizeCanvas(width,height){
		var browserZoomLevel = (window.devicePixelRatio || 1);
		
		if( (width/height) <= (this.ratio) ){
			this.canvas.width = width*browserZoomLevel;
			this.canvas.height = width*(1/this.ratio)*browserZoomLevel;
			
			this.canvas.style.width = width + 'px';
			this.canvas.style.height = width*(1/this.ratio) + 'px';
		} else {
			this.canvas.width = height*(this.ratio)*browserZoomLevel;
			this.canvas.height = height*browserZoomLevel;
			
			this.canvas.style.width = height*(this.ratio) + 'px';
			this.canvas.style.height = height + 'px';
		}
		console.log("Device pixel ratio: "+browserZoomLevel);
		//this.ctx.scale(browserZoomLevel, browserZoomLevel);
		
		return browserZoomLevel;
	}
	
	clearCanvasArea(x,y,width,height,r,g,b,a){ //{r:c,g:c,b:c,a:q} where c: [0,255] and q: [0,1]
		this.ctx.beginPath();
		this.ctx.fillStyle = 'rgba('+r+','+g+','+b+','+a+')';
		this.ctx.fillRect(x,y,width,height);
		this.ctx.stroke();
		
		this.ctx.restore();
	}
	
	drawGrid(){
		for(var i = 0; i < this.canvas.width; i = i + this.getDimension())
			for(var j = 0; j < this.canvas.height ; j = j + this.getDimension())
				this.ctx.strokeRect(i,j,this.getDimension(),this.getDimension());
	}
	
	getDimension(){
		//console.log(this.canvas.style.width);
		return (this.canvas.width/this.unit);
	}
	
	getCanvas(){
		return this.canvas;
	}
	
	getContext(){
		return this.ctx;
	}
	
}
