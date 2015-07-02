var playerAPIloaded = false;
function onYouTubeIframeAPIReady(event) {
	playerAPIloaded = true;
	angular.element(document.querySelector('body')).scope().$broadcast("playerAPIloaded");
}

angular.module('ngTube',[])
.directive("ngTube", function(){
	return {
		restrict: "E",
		scope : {
			url : "@",
			playerStatus : "=status",
			duration : "@",
			quality : "@",
			startseconds: "@"
		},
		link : function ($scope, element, attrs){

			var head = document.getElementsByTagName('head').item(0);
			var script = document.createElement('script');
			script.setAttribute('type', 'text/javascript');
			script.setAttribute('src', 'https://www.youtube.com/iframe_api');
			head.appendChild(script);


			$scope.dragging = false;
			var lastDraggedPosition = 0;


			function getOffsetSum(elem) {
				var top=0, left=0;

				while(elem) {
					top = top + parseInt(elem.offsetTop);
					left = left + parseInt(elem.offsetLeft);
					elem = elem.offsetParent;
				}

				return {top: top, left: left}
			}


			element[0].querySelector(".timeline").addEventListener(
	            'click',
	            function(e) {
					$scope.scrollToCoord(e.offsetX);
	            },
	            false
	        );

			var el = element[0].querySelector(".currentposition");
			var interceptor = element[0].querySelector(".ngtubedraginterceptor");
			var timeline = element[0].querySelector(".timeline");
			var timelineOffset = getOffsetSum(timeline);
			$scope.leftFullOffset = timelineOffset.left;
			$scope.leftOffset = timeline.offsetLeft;

	        $scope.cursorSize = el.offsetWidth;
			$scope.scrollWidth = timeline.offsetWidth;

			el.addEventListener(
	            'onselectstart',
	            function(e) {
	            	return false;
	            }
	        );

			document.addEventListener(
	            'mousedown',
	            function(e) {
	            	if (el === e.target) {
	                	$scope.dragging = true;
	                	interceptor.style.pointerEvents = "auto";
	                	document.body.style.userSelect = "none";
	            	}
	                return true;
	            }
	        );


			document.addEventListener(
	            'mousemove',
	            function(e) {
	            	var pos = e.x - $scope.leftFullOffset;
	            	if ($scope.dragging && pos < $scope.scrollWidth && pos >=0 ) {
	                	$scope.setPosition(pos);
	                	$scope.setCurrentTime(pos / $scope.scrollRatio);
	                	lastDraggedPosition = pos;
	                	$scope.$digest();
	                }
	                return true;
	            }
	        );

			document.addEventListener(
	            'mouseup',
	            function(e) {
	            	if ($scope.dragging) { 
		                $scope.dragging = false;
		            	$scope.scrollToCoord(lastDraggedPosition);
		                interceptor.style.pointerEvents = "none";
		                document.body.style.userSelect = "auto";
	            	}
	                return true;
	            }
	        );


		},
	    template : function(element, attrs) {
	    	if (element.html() != "")
	    		return element.html();
	    	else
		    return ""+
			"<div class='ngtubeplayer'>"+
				"<div class='ngtubeplayercontainer'> "+
					"<div class='ngtubedraginterceptor'></div>"+
			    	"<div id='youtubeplayer'></div> "+
				"</div>"+
			    "<div class='ngtubetimeline'> "+
			        "<div class='timeline'></div> "+
			        "<div class='currentposition' ng-style=\"{'left':cursorLeftOffset+'px'}\"></div> "+
			    "</div> "+
			    "<div class='ngtubecontrols'>"+
				    "<button ng-click='goBack()'>&lt; 10s</button> "+
				    "<button ng-click='playPause()''>"+
				    	"<span ng-show='playerState != 1'>&gt;</span><span ng-show='playerState == 1'>||</span></button> "+
				    "<button ng-click='mute()'>"+
				    	"<span ng-show='isMuted'>Unmute</span><span ng-show='!isMuted'>Mute</span></button> "+
				    "<input class='ngtubevolume' type='range' min='0' max='100' ng-model='volume'></input>" +
				    "<span class='ngtubetimer'>{{currentTimeStr}} / {{durationStr}}</span>" +
			    "</div>" +
			"</div> "
		},
	    controller : ["$scope","$interval",function($scope,$interval){

	    	var playerSetup = false;

	    	function createPlayer(){
				log("ngTube - createPlayer");
				$scope.ytplayer = new YT.Player('youtubeplayer', {
					playerVars: { 'autoplay': 0, 'controls': 0, 'iv_load_policy': 3, 'playsinline': 1, 
						'rel': 0, 'showinfo': 0, 'theme': 'light', wmode: 'opaque' },
					events: {
						'onReady': function () {
							log("ngTube - createPlayer created");
							playerSetup = true;
							$scope.cueVideo();
						}
					}
				});
	    	}

	    	$scope.hidePlayButton = false;
	    	if (navigator.userAgent.indexOf("Mobile") > 0 || navigator.userAgent.indexOf("Android") > 0)
	    		$scope.hidePlayButton = true;

	    	function log(text){
	    		//console.log(text);
	    	}

	    	if (!playerAPIloaded)
		        $scope.$on("playerAPIloaded", function () {
		        	createPlayer();
				});
		    else
		    	createPlayer();

			$scope.playerState = 0;
			$scope.isMuted = false;
			$scope.volume = 0;


			function pad(n, width, z) {
				z = z || '0';
				n = n + '';
				return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
			}

			function formatSeconds(currentTime, totalTime){
				var sec_num = parseInt(currentTime, 10); // don't forget the second param
				var hours   = Math.floor(sec_num / 3600);
				var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
				var seconds = sec_num - (hours * 3600) - (minutes * 60);


				var t_sec_num = parseInt(totalTime, 10); // don't forget the second param
				var t_hours   = Math.floor(t_sec_num / 3600);
				var t_minutes = Math.floor((t_sec_num - (t_hours * 3600)) / 60);
				var t_seconds = t_sec_num - (t_hours * 3600) - (t_minutes * 60);

				var time    = (t_hours > 0 ? pad(hours,2)+':':"")+ pad(minutes,2)+':'+pad(seconds,2);
				return time;
			}

			$scope.cueVideo = function(){

				if (playerSetup) {
					log("ngTube - cueVideo " + $scope.url);

					$scope.ytplayer.cueVideoByUrl({ 
						mediaContentUrl: $scope.url,
						startSeconds: $scope.startseconds,
						suggestedQuality: ($scope.quality ? $scope.quality : "default")
					});

					$scope.volume = $scope.ytplayer.getVolume();

					if ($scope.duration) {
						$scope.durationStr = formatSeconds($scope.duration,$scope.duration);
						$scope.scrollRatio  = $scope.scrollWidth / $scope.duration;
						return;
					}

					log("ngTube - cueVideo determining duration");
					$scope.ytplayer.mute();
					$scope.ytplayer.playVideo();
					var timeDetector = $interval(function(){
						if ($scope.ytplayer.getDuration() > 0) {
							$scope.duration = $scope.ytplayer.getDuration();
							$scope.durationStr = formatSeconds($scope.duration,$scope.duration);
							$scope.ytplayer.pauseVideo();
						    $scope.ytplayer.unMute();

							$scope.scrollRatio  = $scope.scrollWidth / $scope.duration;
							$scope.ytplayer.seekTo(0);
							$interval.cancel(timeDetector);
						}
					},20);
				}
			}

			$scope.$on("scrollPlayer",function(event,time){
				log("ngTube - got event to scroll to "+time);
				$scope.scrollToTime(time);
			});

			$scope.$on("pausePlayer",function(event,time){
        		log("ngTube - pause");
	            $scope.ytplayer.pauseVideo();
			});

			$scope.$watch("url",function(url){
        		log("ngTube - watch " + url);
				$scope.cueVideo();
			});

			$scope.$watch("volume",function(volume){
				if (playerSetup)
					$scope.ytplayer.setVolume(volume);
			});

			var scroller = $interval(function () {
				if (playerSetup) {

		        	log("ngTube - state " + $scope.ytplayer.getPlayerState());

					if (!$scope.currentTime || $scope.ytplayer.getCurrentTime() > 0) 
						$scope.currentTime = $scope.ytplayer.getCurrentTime();

					if ($scope.currentTime > 0) $scope.hidePlayButton = false;

					$scope.playerStatus = {"currentTime":$scope.currentTime};

					$scope.playerState = $scope.ytplayer.getPlayerState();
					$scope.isMuted = $scope.ytplayer.isMuted();

					if (!$scope.dragging){
						//log("ngTube - scroller at " + $scope.currentTime);
		            	$scope.setPosition($scope.currentTime * $scope.scrollRatio);
						$scope.setCurrentTime($scope.currentTime);
					}

					$scope.$emit("playerStatusChange");
		        }
			},100);

			$scope.setCurrentTime = function(time){
				$scope.currentTime = time;
				$scope.playerStatus = {"currentTime":$scope.currentTime};
				$scope.currentTimeStr = formatSeconds(time, $scope.duration);
				//log("ngTube setCurrentTime(" + $scope.playerStatus.currentTime+")");
			}

	        $scope.$on("$destroy", function () {
	          if (angular.isDefined(scroller)) {
	            $interval.cancel(scroller);
	            scroller = undefined;
	          }
	        });

	        $scope.setPosition = function (x) {
	          $scope.cursorLeftOffset = x;
	        }

	        $scope.playPause = function () {
	        	if ($scope.ytplayer.getPlayerState() == 1){
	        		log("ngTube - pause");
	            	$scope.ytplayer.pauseVideo();
        		}
	        	else {
	        		log("ngTube - play");
	            	$scope.ytplayer.playVideo();
	        	}
	        }

	        $scope.pauseVideo = function(){
        		log("ngTube - pause");
	            $scope.ytplayer.pauseVideo();
	        }

	        $scope.goBack = function () {
	          log("ngTube - go back 10 seconds");
	          $scope.ytplayer.seekTo($scope.currentTime - 10);
	        }

	        $scope.mute = function () {
	        	if ($scope.ytplayer.isMuted())
	        		$scope.ytplayer.unMute();
	        	else
	        		$scope.ytplayer.mute();
	        }

	        $scope.scrollToCoord = function (x) {
	          log("ngTube - scrollToCoord(" + x + ")");
	          var time = x / $scope.scrollRatio;
	          $scope.setCurrentTime(time);
	          $scope.ytplayer.seekTo(time);
	          $scope.setPosition(x);
	        }

	        $scope.scrollToTime = function (time) {
		        log("ngTube - scrollToTime(" + time+")");
				$scope.ytplayer.seekTo(time);
				$scope.setCurrentTime(time);
				$scope.setPosition(time * $scope.scrollRatio);
	        }

	    }]
		}
	}
);
