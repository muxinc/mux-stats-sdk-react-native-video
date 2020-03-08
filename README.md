# Mux Data Integration with react-native-video

This is a package for using [Mux Data](https://mux.com/data/) for video QoS monitoring with
a react-native-video player.

## Requirements

1. A functioning react-native application that uses react-native-video.
1. react-native >= 16.9.0
1. react-native-video >= 5.0.2

## Installation

Install with either yarn or npm:

```
yarn add mux-react-native-video-sdk
```

OR

```
npm install mux-react-native-video-sdk
```

## Usage

This package works by wrapping your `Video` component in a higher order component.

For more information about what keys can be passed into the `data` key in the `muxOptions` prop see
[the javascript docs](https://docs.mux.com/docs/web-integration-guide#section-5-add-metadata).

```jsx
// import Video from react-native-video like your normally would
import Video from 'react-native-video';
import muxReactNativeVideo from 'mux-react-native-video-sdk';

// wrap the `Video` component with Mux functionality
const MuxVideo = muxReactNativeVideo(Video);


// Pass the same props to `MuxVideo` that you would pass to the
// `Video` element. All of these props will be passed through
// add a prop for `muxOptions`
<MuxVideo
  style={styles.video}
  source={{
    uri:
      'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
  }}
  controls
  muted
  onBuffer={handleBuffer}
  onError={handleError}
  muxOptions={{
    debug: false,
    data: {
      env_key: 'YOUR_ENVIRONMENT_KEY',
      player_name: 'React Native Player',
      video_id: 'My Video Id',
      video_title: 'My awesome video',
    },
  }}
/>
```

## Caveats

Upscale and downscale % metrics are not calculated for HLS sources because of https://github.com/react-native-community/react-native-video/issues/1194.

