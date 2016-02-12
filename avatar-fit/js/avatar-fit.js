Photobooth = function( container )
{
    var self = this;
    /**
     * Checks for different prefixes of navigator.GetUserMedia, or if it's not supported on current browser
     */
	var fGetUserMedia = (
		navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.oGetUserMedia || navigator.msieGetUserMedia ||
		false
	);
	/**
	* True if the browser supports Webcam streams, false if not
	*/
	this.isSupported = !! fGetUserMedia;	
	/**
	* Image callback. Will be called when the user clicks the trigger
	* Receives the image as a dataURL string
	*/
	this.onImage = function(){};
	/**
	* Closes the videostream, cancels the canvas drawing loop and frees up the webcam. 
	* Use resume() to continue
	*/
	this.pause = function() {
		if( bIsStopped === false ) {
			bIsStopped = true;
			if( oStream && oStream.stop ) {
				oStream.stop();
			}
		}
	};	
	/**
	* Resumes video playback that had previously been paused with pause().
	*/
	this.resume = function() {
		if( bIsStopped === true ) {
			bIsStopped = false;
			fRequestWebcamAccess();
		}
	};
	/**
	* Closes the video stream, cancels all outstanding frames and destroys the DOM elements and eventlisteners.
	*/
	this.destroy = function() {
		this.pause();
		container.removeChild( eCameraCap );
	};
	/**
	* Resizes the Photobooth to the desired size. Minimum for both width and height is 200px
	*/
	this.resize = function( width, height ) {
	    if (height == 0) { // auto-height conserving aspect ratio when height is zero
	        height = eVideo.videoHeight / (eVideo.videoWidth / width);

	        if (isNaN(height)) {
                //Fix for firefox
	            height = width / (4 / 3);
	        }
	    }

		if( width < 200 || height < 200) {
			throw "Error: Not enough space for Photobooth. Min height / width is 200 px";
		}

		_width = width;
		_height = height;
		eCameraCap.style.width = width + "px";
		eCameraCap.style.height = height + "px";
		eInput.width = width;
		eInput.height = height;
		eOutput.width = width;
		eOutput.height = height;
		eVideo.width = width;
		eVideo.height = height;
	};	

	this.capture = function () {
	    /**
        * Flash
        */
	    eBlind.className = "blind";
	    eBlind.style.opacity = 1;
	    setTimeout(function () { eBlind.className = "blind anim"; eBlind.style.opacity = 0; }, 50);

	    var mData = {};
	    if (bVideoOnly) {
            mData = {
                x: ((_width - eVideo.videoWidth) / 2),
                y: ((_height - eVideo.videoHeight) / 2),
                width: eVideo.videoWidth,
                height: eVideo.videoHeight
            };
        }
        else {
            mData = {
                x: 0,
                y: 0,
                width: _width,
                height: _height
            };
        }
	        
	    var eTempCanvas = cE("canvas");
	    eTempCanvas.width = mData.width;
	    eTempCanvas.height = mData.height;

	    if (bVideoOnly) {
	        eTempCanvas.getContext("2d").drawImage(
				eVideo,
				Math.max(0, mData.x - ((_width - eVideo.videoWidth) / 2)),
				Math.max(mData.y - ((_height - eVideo.videoHeight) / 2)),
				mData.width,
				mData.height,
				0,
				0,
				mData.width,
				mData.height);
	    }
	    else {
	        var oImageData = oOutput.getImageData(mData.x, mData.y, mData.width, mData.height);
	        eTempCanvas.getContext("2d").putImageData(oImageData, 0, 0);
	    }

	    scope.onImage(eTempCanvas.toDataURL());
	};

	var bVideoOnly = false,
		bIsStopped = false,
		oStream = null,
		scope = this,
		_width = container.offsetWidth,
		_height = container.offsetHeight;

	var fGetAnimFrame = (
		window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
		function( callback ){ window.setTimeout(callback, 1000 / 60); }
	);
	
	var c = function( n ){ return eCameraCap.getElementsByClassName( n )[ 0 ]; };
	var cE = function( s ){ return document.createElement( s ); };

	var eCameraCap = cE( "div" );
	eCameraCap.className = "photobooth";
	eCameraCap.innerHTML = '<div class="blind"></div><canvas></canvas><div class="warning notSupported">Sorry, not supported by your browser</div><div class="warning noWebcam">Please give permission to use your Webcam. <span>Try again</span></div><ul><li title="hue"class="hue"></li><li title="saturation"class="saturation"></li><li title="brightness"class="brightness"></li><li title="crop"class="crop"></li><li title="take picture"class="trigger"></li></ul>';

	var eInput = cE( "canvas" );
	var oInput = eInput.getContext( "2d" );
	var eOutput = eCameraCap.getElementsByTagName( "canvas" )[ 0 ];
	var oOutput = eOutput.getContext( "2d" );
	var eVideo = cE( "video" );
	eVideo.autoplay = true;
	
	var eNoWebcamWarning = c( "noWebcam" );
	eNoWebcamWarning.getElementsByTagName( "span" )[ 0 ].onclick = function(){ fRequestWebcamAccess(); };

	var eBlind = c( "blind" );
	c( "trigger" ).onclick = function() {
	    self.capture();
	};
	
	var fOnStream = function( stream )
	{
		oStream = stream;

		try{
			/**
			* Chrome
			*/
			eVideo.src = ( window.URL || window.webkitURL ).createObjectURL( oStream );
			fGetAnimFrame( fNextFrame );
		}
		catch( e )
		{
			/**
			* Firefox
			*/
			eVideo.mozSrcObject  =   oStream ;
			bVideoOnly = true;
			eCameraCap.appendChild( eVideo );
			eCameraCap.getElementsByTagName( "ul" )[ 0 ].className = "noHSB";

			eVideo.play();
		}
	};
	var fOnStreamError = function( e )
	{
		eNoWebcamWarning.style.display = "block";
	};
	var fRequestWebcamAccess = function()
	{
		eNoWebcamWarning.style.display = "none";
		fGetUserMedia.call( navigator, {"video" : true }, fOnStream, fOnStreamError );
	};

	var fNextFrame = function() {
		try { oInput.drawImage( eVideo, 0, 0, _width, _height ); } catch(e){}
		var oImgData = oInput.getImageData( 0, 0, _width, _height );
		var pData = oImgData.data;
		oOutput.putImageData( oImgData, 0, 0 );
		if( bIsStopped === false ) { fGetAnimFrame( fNextFrame ); }
	};

	this.resize( _width, _height );
	container.appendChild( eCameraCap );

	if( fGetUserMedia ) {
		fGetAnimFrame( fRequestWebcamAccess );
	} else {
		c( "notSupported" ).style.display = "block";
	}
}