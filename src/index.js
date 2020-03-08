import mux from 'mux-embed';
import React, {useEffect, useState, useCallback} from 'react';
// const log = mux.log;
const secondsToMs = mux.utils.secondsToMs;
const assign = mux.utils.assign;
/*
const getComputedStyle = mux.utils.getComputedStyle; // If necessary to get
const extractHostname = mux.utils.extractHostname;
*/

const MIN_REBUFFER_DURATION = 300 // this should be more than 250 because getPlayheadTime will only update every 250ms

const noop = function () { };

// Helper function to generate "unique" IDs for the player if your player does not have one built in
const generateShortId = function() {
  return ('000000' + ((Math.random() * Math.pow(36, 6)) << 0).toString(36)) // eslint-disable-line no-bitwise
    .slice(-6);
};

/*
 *  I was planning to save the currentTime state in the components
 *  React state with `setState`. That does not work because the
 *  onProgress event fires too frequently that calling setState() inside
 *  of that callback results in this error: React Native: Maximum update depth exceeded
*/
const playerState = {};

const saveStateForPlayer = (playerID, key, value) => {
  playerState[playerID] = playerState[playerID] || {};
  playerState[playerID][key] = value;
}

const getStateForPlayer = (playerID, key, value) => {
  return playerState[playerID] && playerState[playerID][key];
}

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
      console.warn(`[mux-react-native-video] found progressUpdateInterval value of ${progressUpdateInterval} - overriding to 250. This is required for the mux-react-native-video to correctly track rebuffering`);
      progressUpdateInterval = 250;
    }

    const [state, setState] = useState({playerID: null});
    const {playerID} = state;

    const emit = (eventType, data) => {
      console.log('debug mux.emit', eventType);
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
    }

    const _onSeek = evt => {
      emit('seeked');
      onSeek(evt);
    }

    const _onLoad = evt => {
      console.log('debug onLoad', evt);
      if (evt.duration) {
        saveStateForPlayer(playerID, 'duration', secondsToMs(evt.duration));
      }
      onLoad(evt);
    }

    const _onPlaybackRateChange = evt => {
      const lastRate = getStateForPlayer(playerID, 'lastRateChange');
      const newRate = evt.playbackRate;
      if (lastRate === newRate) {
        console.log('debug rate did not change', lastRate, newRate);
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
    }

    const _onFullscreenPlayerDidPresent = evt => {
      saveStateForPlayer(playerID, 'isFullscreen', true);
      onFullscreenPlayerDidPresent(evt);
    }

    const _onFullscreenPlayerDidDismiss = evt => {
      saveStateForPlayer(playerID, 'isFullscreen', false);
      onFullscreenPlayerDidDismiss(evt);
    }

    useEffect(() => {
      setState({...state, playerID: generateShortId()});
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
          // player_mux_plugin_version: '[AIV]{version}[/AIV]' // TODO
        },
        options.data,
      );

      options.getStateData = function () {
        return {
          // Required properties - these must be provided every time this is called
          // You _should_ only provide these values if they are defined (i.e. not 'undefined')
          player_is_paused: getStateForPlayer(playerID, 'isPaused'),
          // player_width: getVideoElDimension('width'),
          // player_height: getVideoElDimension('height'),
          // video_source_height: player.getStats().height,
          // video_source_width: player.getStats().width,

          // Preferred properties - these should be provided in this callback if possible
          // If any are missing, that is okay, but this will be a lack of data for the customer at a later time
          player_is_fullscreen: getStateForPlayer(playerID, 'isFullscreen'),
          player_autoplay_on: !otherProps.paused,
          // player_preload_on: isPreload(),
          video_source_url: source && source.uri,
          // video_source_mime_type: getMimeType(),
          video_source_duration: getStateForPlayer(playerID, 'duration'),

          // Optional properties - if you have them, send them, but if not, no big deal
          video_poster_url: otherProps.poster,
          // player_language_code: getVideoElementProp('lang') // Return the language code (e.g. `en`, `en-us`)
        };
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
