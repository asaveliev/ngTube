function onYouTubeIframeAPIReady(event) {
	angular.element(document.querySelector('body')).scope().$broadcast("playerAPIloaded");
}

angular.module('ngTube',[])
.directive("ngTube", function(){
	return {
		restrict: "E",
		scope : {
			mediaUrl : "@"
		},
		link : function ($scope, element, attrs){

			var head = document.getElementsByTagName('head').item(0);
			var script = document.createElement('script');
			script.setAttribute('type', 'text/javascript');
			script.setAttribute('src', 'https://www.youtube.com/iframe_api');
			head.appendChild(script);


			$scope.dragging = false;
			var lastDraggedPosition = 0;

			element[0].querySelector(".timeline").addEventListener(
	            'click',
	            function(e) {
					$scope.scrollTo(e.offsetX);
	            },
	            false
	        );

			var el = element[0].querySelector(".currentposition");
			var interceptor = element[0].querySelector(".ngtubedraginterceptor");
			var timeline = element[0].querySelector(".timeline");

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
	            	var pos = e.x - timeline.offsetLeft;
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
		            	$scope.scrollTo(lastDraggedPosition);
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
				"bar<div class='ngtubeplayercontainer'> "+
					"<div class='ngtubedraginterceptor'></div>"+
			    	"<div id='youtubeplayer'></div> "+
				"</div>"+
			    "<div class='ngtubetimeline'> "+
			        "<div class='timeline'></div> "+
			        "<div class='currentposition' ng-style=\"{'left':leftOffset}\"></div> "+
			    "</div> "+
			    "<div class='ngtubecontrols'>"+
				    "<button ng-click='goBack()'>&lt; 10s</button> "+
				    "<button ng-click='playPause()''>"+
				    	"<span ng-show='playerState != 1'>&gt;</span><span ng-show='playerState == 1'>||</span></button> "+
				    "<button ng-click='mute()'>"+
				    	"<span ng-show='isMuted'>Mute</span><span ng-show='!isMuted'>Unmute</span></button> "+
				    "<input class='ngtubevolume' type='range' min='0' max='100' ng-model='volume'></input>" +
				    "<span class='ngtubetimer'>{{currentTimeStr}} / {{durationStr}}</span>" +
			    "</div>" +
			"</div> "
		},
	    controller : ["$scope","$interval",function($scope,$interval){
	        $scope.$on("playerAPIloaded", function () {
				$scope.ytplayer = new YT.Player('youtubeplayer', {
					playerVars: { 'autoplay': 0, 'controls': 0, 'iv_load_policy': 3, 'playsinline': 1, 
						'rel': 0, 'showinfo': 0, 'theme': 'light', wmode: 'opaque' },
					events: {
						'onReady': function () {
							
							$scope.cueVideo();

							$scope.ytplayer.mute();
							$scope.volume = $scope.ytplayer.getVolume();

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
				});
			});

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

				var time    = (t_hours > 0 ? pad(hours,2)+':':"")+(t_minutes > 0 ? pad(minutes,2)+':':"")+pad(seconds,2);
				return time;
			}

			$scope.cueVideo = function(){
				$scope.ytplayer.cueVideoByUrl({ 
					mediaContentUrl: $scope.mediaUrl 
				});
			}

			$scope.$watch("volume",function(volume){
				if ($scope.ytplayer)
					$scope.ytplayer.setVolume(volume);
			});

			var scroller = $interval(function () {
				if ($scope.ytplayer && $scope.ytplayer.getCurrentTime) {
					$scope.currentTime = $scope.ytplayer.getCurrentTime();

					$scope.playerState = $scope.ytplayer.getPlayerState();
					$scope.isMuted = $scope.ytplayer.isMuted();

					if (!$scope.dragging){
		            	$scope.setPosition($scope.currentTime * $scope.scrollRatio);
						$scope.setCurrentTime($scope.currentTime);
					}
		        }
			},100);

			$scope.setCurrentTime = function(time){
				$scope.currentTime = time;
				$scope.currentTimeStr = formatSeconds(time, $scope.duration);
			}

	        $scope.$on("$destroy", function () {
	          if (angular.isDefined(scroller)) {
	            interval.cancel(scroller);
	            scroller = undefined;
	          }
	        });

	        $scope.setPosition = function (x) {
	          $scope.leftOffset = (x - $scope.cursorSize / 2) + "px";
	        }

	        $scope.playPause = function () {
	          if ($scope.ytplayer.getPlayerState() == 1)
	            $scope.ytplayer.pauseVideo();
	          else
	            $scope.ytplayer.playVideo();
	        }

	        $scope.goBack = function () {
	          $scope.ytplayer.seekTo($scope.currentTime - 10);
	        }

	        $scope.mute = function () {
	        	if ($scope.ytplayer.isMuted())
	        		$scope.ytplayer.unMute();
	        	else
	        		$scope.ytplayer.mute();
	        }

	        $scope.scrollTo = function (x) {
	          var position = x / $scope.scrollRatio;
	          $scope.ytplayer.seekTo(position);
	          $scope.setPosition(x);
	        }

	    }]
		}
	}
);
