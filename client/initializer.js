function loadImages(imagefiles,callback) {
	// Initialize variables
	var newpos;
	loadcount = 0;
	loadtotal = imagefiles.length;
	preloaded = false;

	// Load the images
	//var loadedimages = [];
	for (var i=0; i<imagefiles.length; i++) {
		// Create the image object
		var image = new Image();
		
		image.onload = function () {
			loadcount++;
			if (loadcount == loadtotal) {
				// Done loading
				preloaded = true;
				callback();
			}
		};

		// Set the source url of the image
		image.src = imagefiles[i];
			image.onerror =  function(){ alert('Some images could not be loaded.'); }; //error handler, just to make sure everything is fine (but preloaded=false is the same thing)
		// Save to the image array
		newpos = imagefiles[i].replace('/client/imgs/', '');
		newpos = newpos.replace('.png', '');
		loadedimages[newpos] = image;
	}

	// Return an array of images
	return loadedimages;
}

//SET SCREEN
function setScreen(arrToDisplay,arrToHide){
	for(var i in arrToDisplay){
		if(document.getElementById(arrToDisplay[i]))
			document.getElementById(arrToDisplay[i]).style.display = 'block';
	}
	for(var j in arrToHide){
		if(document.getElementById(arrToHide[j]))
			document.getElementById(arrToHide[j]).style.display = 'none';
	}
}


//PREVENT RIGHT CLICK
$(this).bind("contextmenu", function (e) {
   e.preventDefault();
 });
 
 
 /*
 function debugLoader(){
	var imgs = [];
	imgs.push("/client/imgs/player.png");
	
	loadImages(imgs);
}

*/
