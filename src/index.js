import mux from 'mux-embed';
import React, { useEffect, useState } from 'react'; // eslint-disable-line no-unused-vars
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

/*
 *  I wanted to save the playerState in the component's
 *  React state with `setState`. That does not work because the
 *  onProgress event fires so frequently that calling setState() inside
 *  of that callback results in this error: React Native: Maximum update depth exceeded
*/
const playerState = {};

const saveStateForPlayer = (playerID, key, value) => {
  playerState[playerID] = playerState[playerID] || {};
  playerState[playerID][key] = value;
};

const getStateForPlayer = (playerID, key, value) => {
  return playerState[playerID] && playerState[playerID][key];
};

export default (WrappedComponent) => {
  return ({
    onProgress = noop,
    onEnd = noop,
    onSeek = noop,
    onLoad = noop,
    onPlaybackRateChange = noop,
    onFullscreenPlayerDidPresent = noop,
    onFullscreenPlayerDidDismiss = noop,
    muxOptions: options,
    progressUpdateInterval,
    source,
    ...otherProps
  }) => {
    if (progressUpdateInterval && progressUpdateInterval !== 250) {
      console.log(`[mux-react-native-video] found progressUpdateInterval value of ${progressUpdateInterval} - overriding to 250. This is required for the mux-react-native-video to correctly track rebuffering`);
      progressUpdateInterval = 250;
    }

    const [state, setState] = useState({ playerID: null });
    const { playerID } = state;

    const emit = (eventType, data) => {
      mux.emit(playerID, eventType, data);
    };

    const _onProgress = evt => {
      saveStateForPlayer(playerID, 'currentTime', secondsToMs(evt.currentTime));
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
        saveStateForPlayer(playerID, 'duration', secondsToMs(evt.duration));
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
          saveStateForPlayer(playerID, 'sourceWidth', evt.naturalSize.width);
        }
        if (evt.naturalSize.height && evt.naturalSize.height !== 'undefined') {
          saveStateForPlayer(playerID, 'sourceHeight', evt.naturalSize.height);
        }
      }
      onLoad(evt);
    };

    const _onPlaybackRateChange = evt => {
      const lastRate = getStateForPlayer(playerID, 'lastRateChange');
      const newRate = evt.playbackRate;

      if (lastRate === newRate) {
        onPlaybackRateChange(evt);
        return;
      }
      saveStateForPlayer(playerID, 'lastRateChange', evt.playbackRate);
      if (newRate === 0) {
        saveStateForPlayer(playerID, 'isPaused', true);
        emit('pause');
      } else {
        saveStateForPlayer(playerID, 'isPaused', false);
        emit('playing');
      }
      onPlaybackRateChange(evt);
    };

    const _onFullscreenPlayerDidPresent = evt => {
      saveStateForPlayer(playerID, 'isFullscreen', true);
      onFullscreenPlayerDidPresent(evt);
    };

    const _onFullscreenPlayerDidDismiss = evt => {
      saveStateForPlayer(playerID, 'isFullscreen', false);
      onFullscreenPlayerDidDismiss(evt);
    };

    useEffect(() => {
      const playerID = generateShortId();
      setState({ ...state, playerID });
      //
      // The callback below gets called when the component is unmounted,
      // and by that time the `state` and `state.playerID` have been cleaned
      // up, so the `playerID` variable will be `null`. For that reason,
      // let's cache the playerID in a local variable, `playerIDCopy` and use
      // it to emit the 'destroy' event.
      //
      const playerIDCopy = playerID;
      return () => {
        mux.emit(playerIDCopy, 'destroy');
        delete playerState.playerID;
      };
    }, []);

    useEffect(() => {
      if (!playerID) return;
      options.getPlayheadTime = () => {
        return getStateForPlayer(playerID, 'currentTime');
      };

      options.minimumRebufferDuration = MIN_REBUFFER_DURATION;

      options.data = assign(
        {
          player_software_name: 'React native video',
          player_is_paused: getStateForPlayer(playerID, 'isPaused'),
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
          player_is_paused: getStateForPlayer(playerID, 'isPaused'),
          // player_width: getStateForPlayer(playerID, 'playerWidth'),
          // player_height: getStateForPlayer(playerID, 'playerHeight'),
          video_source_height: getStateForPlayer(playerID, 'sourceWidth'),
          video_source_width: getStateForPlayer(playerID, 'sourceHeight'),

          // Preferred properties - these should be provided in this callback if possible
          // If any are missing, that is okay, but this will be a lack of data for the customer at a later time
          player_is_fullscreen: getStateForPlayer(playerID, 'isFullscreen'),
          player_autoplay_on: !otherProps.paused,
          // player_preload_on: isPreload(),
          video_source_url: source && source.uri,
          // video_source_mime_type: getMimeType(),
          video_source_duration: getStateForPlayer(playerID, 'duration'),

          // Optional properties - if you have them, send them, but if not, no big deal
          video_poster_url: otherProps.poster
          // player_language_code: getVideoElementProp('lang') // Return the language code (e.g. `en`, `en-us`)
        };
      };

      options.platform = {
//        name:
//        version:
//         layout:
//         product:
//         manufacturer:
        os: {
          family: Platform.OS,
          version: Platform.Version
        }
      };

      mux.init(playerID, options);
      if (!otherProps.paused) {
        emit('play');
      }
    }, [playerID]);

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
        {...otherProps}
      />
    );
  };
};
