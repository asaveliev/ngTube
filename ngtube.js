function onYouTubeIframeAPIReady(event) {
	angular.element(document.querySelector('body')).scope().$broadcast("playerAPIloaded");
}

angular.module('ngTube',[])
.directive("ngTube", function(){
	return {
		restrict: "E",
		replace: true,
		transclude: false,
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
	    template : ""+
			"<div class='ngtubeplayer'> "+
				"<div class='ngtubeplayercontainer'> "+
					"<div class='ngtubedraginterceptor'></div>"+
			    	"<div id='youtubeplayer'></div> "+
				"</div>"+
			    "<div class='ngtubetimeline'> "+
			        "<div class='timeline'></div> "+
			        "<div class='currentposition' ng-style=\"{'left':leftOffset}\"></div> "+
			    "</div> "+
			    "<div class='ngtubecontrols'>"+
				    "<button ng-click='goBack()''><span class='glyphicon glyphicon-repeat'></span> 10s</button> "+
				    "<button ng-class=\"{'btn-success':playerState != 1,'btn-warning':playerState == 1}\" ng-click='playPause()''><span class='glyphicon glyphicon-play'></span> <span class='glyphicon glyphicon-pause'></span></button> "+
				    "<button ng-class=\"{'btn-success':isMuted != 1,'btn-warning':isMuted == 1}\" ng-click='mute()'><span class='glyphicon glyphicon-volume-off'></span></button> "+
				    "<input class='ngtubevolume' type='range' min='0' max='100' ng-model='volume'></input>" +
				    "<span class='ngtubetimer'>{{currentTime}} / {{duration}}</span>" +
			    "</div>" +
			"</div> "
	    ,
	    controller : ["$scope","$interval",function($scope,$interval){
	        $scope.$on("playerAPIloaded", function () {
				$scope.ytplayer = new YT.Player('youtubeplayer', {
					playerVars: { 'autoplay': 0, 'controls': 0, 'iv_load_policy': 3, 'playsinline': 1, 
						'rel': 0, 'showinfo': 0, 'theme': 'light', wmode: 'opaque' },
					events: {
						'onReady': function () {
							
							$scope.cueVideo();

							$scope.ytplayer.mute();
							$scope.ytplayer.playVideo();
							$scope.volume = $scope.ytplayer.getVolume();

							var timeDetector = $interval(function(){
								if ($scope.ytplayer.getDuration() > 0) {
									$scope.duration = $scope.ytplayer.getDuration();
									$scope.ytplayer.pauseVideo();
								    //$scope.ytplayer.unMute();

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

					$scope.playerState = ytplayer.getPlayerState();
					$scope.isMuted = ytplayer.isMuted();

					if (!$scope.dragging)
		            	$scope.setPosition($scope.currentTime * $scope.scrollRatio);
		        }
			},100);

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
