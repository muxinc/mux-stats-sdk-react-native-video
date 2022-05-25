import mux from 'mux-embed';
import React, { useEffect, useImperativeHandle } from 'react'; // eslint-disable-line no-unused-vars
import { Platform } from 'react-native';
import lib from '../package.json';
const secondsToMs = mux.utils.secondsToMs;
const assign = mux.utils.assign;

const MIN_REBUFFER_DURATION = 300; // this should be more than 250 because getPlayheadTime will only update every 250ms

const noop = function () { };

// Helper function to generate "unique" IDs for the player if your player does not have one built in
const generateShortId = function () {
  return ('000000' + ((Math.random() * Math.pow(36, 6)) << 0).toString(36)) // eslint-disable-line no-bitwise
    .slice(-6);
};

export default (WrappedComponent) => {
  return React.forwardRef(({
    onProgress = noop,
    onEnd = noop,
    onSeek = noop,
    onLoad = noop,
    onPlaybackRateChange = noop,
    onFullscreenPlayerDidPresent = noop,
    onFullscreenPlayerDidDismiss = noop,
    muxOptions,
    progressUpdateInterval,
    source,
    ...otherProps
  }, ref) => {
    const options = Object.assign({}, muxOptions);
    if (!options.application_name) {
      console.error('[mux-react-native-video] missing muxOptions.application_name - this value is required');
    }
    if (progressUpdateInterval && progressUpdateInterval !== 250) {
      console.log(`[mux-react-native-video] found progressUpdateInterval value of ${progressUpdateInterval} - overriding to 250. This is required for the mux-react-native-video to correctly track rebuffering`);
      progressUpdateInterval = 250;
    }

    const didStartPaused = otherProps.paused;

    const stateRef = React.useRef({ playerID: generateShortId() });
    const saveStateForPlayer = (key, value) => {
      stateRef.current[key] = value;
    };

    const getStateForPlayer = (key) => {
      return stateRef.current[key];
    };

    const emit = (eventType, data) => {
      mux.emit(stateRef.current.playerID, eventType, data);
    };

    const emitPlay = () => {
      setPlayerStatus('play');
      emit('play');
    };

    const setPlayerStatus = (status) => saveStateForPlayer('currentStatus', status);
    const getPlayerStatus = () => getStateForPlayer('currentStatus');

    useImperativeHandle(ref, () => ({
      mux: () => ({ emit })
    }));

    const _onProgress = evt => {
      saveStateForPlayer('currentTime', secondsToMs(evt.currentTime));
      if (getPlayerStatus() === 'paused') {
        return;
      }

      if (getPlayerStatus() === 'play') {
        setPlayerStatus('playing');
        emit('playing');
      }
      emit('timeupdate', { player_playhead_time: secondsToMs(evt.currentTime) });
      onProgress(evt);
    };

    const _onEnd = evt => {
      emit('ended');
      onEnd(evt);
    };

    const _onSeek = evt => {
      emit('seeked');
      onSeek(evt);
    };

    const _onLoad = evt => {
      if (evt.duration) {
        saveStateForPlayer('duration', secondsToMs(evt.duration));
      }
      if (evt.naturalSize) {
        //
        // You may be wondering why we're comparing this value to the string 'undefined' instead
        // of the value 'undefined'. Glad you asked. This is not a typeo, it turns out that sometimes,
        // infact the value is the string 'undefined'
        //
        // https://github.com/react-native-community/react-native-video/issues/1194
        //
        if (evt.naturalSize.width && evt.naturalSize.width !== 'undefined') {
          saveStateForPlayer('sourceWidth', evt.naturalSize.width);
        }
        if (evt.naturalSize.height && evt.naturalSize.height !== 'undefined') {
          saveStateForPlayer('sourceHeight', evt.naturalSize.height);
        }
      }
      onLoad(evt);
    };

    const _onPlaybackRateChange = evt => {
      const lastRate = getStateForPlayer('lastRateChange');
      const newRate = evt.playbackRate;
      const isFirstPlayAttempt = (didStartPaused && lastRate === undefined && newRate);
      const isUnPausing = (lastRate === 0 && newRate);
      saveStateForPlayer('lastRateChange', evt.playbackRate);

      if (lastRate === newRate) {
        onPlaybackRateChange(evt);
        return;
      }

      if (isFirstPlayAttempt || isUnPausing) {
        emitPlay();
        onPlaybackRateChange(evt);
        return;
      }

      if (newRate === 0) {
        emit('pause');
        setPlayerStatus('paused');
        onPlaybackRateChange(evt);
        return;
      }
    };

    const _onFullscreenPlayerDidPresent = evt => {
      saveStateForPlayer('isFullscreen', true);
      onFullscreenPlayerDidPresent(evt);
    };

    const _onFullscreenPlayerDidDismiss = evt => {
      saveStateForPlayer('isFullscreen', false);
      onFullscreenPlayerDidDismiss(evt);
    };

    useEffect(() => {
      options.getPlayheadTime = () => {
        return getStateForPlayer('currentTime');
      };

      options.minimumRebufferDuration = MIN_REBUFFER_DURATION;
      const platformName = options.application_name;
      delete options.application_name;
      const platformVersion = options.application_version;
      delete options.application_version;

      options.data = assign(
        {
          player_software_name: 'React native video',
          player_is_paused: getStateForPlayer('isPaused'),
          // player_software_version: player.constructor.version, // TODO
          player_mux_plugin_name: 'react-native-video-mux',
          player_mux_plugin_version: lib.version
        },
        options.data
      );

      options.getStateData = function () {
        return {
          // Required properties - these must be provided every time this is called
          // You _should_ only provide these values if they are defined (i.e. not 'undefined')
          player_is_paused: getStateForPlayer('isPaused'),
          // player_width: getStateForPlayer('playerWidth'),
          // player_height: getStateForPlayer('playerHeight'),
          video_source_height: getStateForPlayer('sourceWidth'),
          video_source_width: getStateForPlayer('sourceHeight'),

          // Preferred properties - these should be provided in this callback if possible
          // If any are missing, that is okay, but this will be a lack of data for the customer at a later time
          player_is_fullscreen: getStateForPlayer('isFullscreen'),
          player_autoplay_on: !otherProps.paused,
          // player_preload_on: isPreload(),
          video_source_url: source && source.uri,
          // video_source_mime_type: getMimeType(),
          video_source_duration: getStateForPlayer('duration'),

          // Optional properties - if you have them, send them, but if not, no big deal
          video_poster_url: otherProps.poster
          // player_language_code: getVideoElementProp('lang') // Return the language code (e.g. `en`, `en-us`)
        };
      };

      options.platform = {
        //         layout:
        //         product:
        //         manufacturer:
        os: {
          family: Platform.OS,
          version: Platform.Version
        }
      };
      if (platformName) {
        options.platform.name = platformName;
      }
      if (platformVersion) {
        options.platform.version = platformVersion;
      }

      mux.init(stateRef.current.playerID, options);
      if (!didStartPaused) {
        emitPlay();
      }

      return () => {
        emit('destroy');
      };
    }, []);

    const sourceUri = source && source.uri;
    useEffect(() => {
      if (!sourceUri) return;

      if (!getStateForPlayer('sourceUri')) {
        // do not send a videochange event for the first source
        saveStateForPlayer('sourceUri', sourceUri);
        return;
      }

      saveStateForPlayer('sourceUri', sourceUri);
      emit('videochange', {
        video_id: options.data.video_id,
        video_title: options.data.video_title,
        video_series: options.data.video_series,
        video_duration: options.data.video_duration,
        video_stream_type: options.data.video_stream_type,
        video_encoding_variant: options.data.video_encoding_variant,
      });
    }, [sourceUri]);

    return (
      <WrappedComponent
        onProgress={_onProgress}
        onEnd={_onEnd}
        onSeek={_onSeek}
        onLoad={_onLoad}
        onPlaybackRateChange={_onPlaybackRateChange}
        progressUpdateInterval={progressUpdateInterval}
        onFullscreenPlayerDidPresent={_onFullscreenPlayerDidPresent}
        onFullscreenPlayerDidDismiss={_onFullscreenPlayerDidDismiss}
        source={source}
        ref={ref}
        {...otherProps}
      />
    );
  });
};
