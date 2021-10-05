# Mux Data Integration with react-native-video

This is a package for using [Mux Data](https://mux.com/data/) for video QoS monitoring with a react-native-video player.

View the DemoApp/ directory to see a demo application that implements this library.

## Requirements

1. A functioning react-native application that uses react-native-video.
1. react-native ~> 16.9
1. react-native-video ~> 5.0.2

## Installation

Install from github in your package.json (when this is officially released then it will be availble on npm).

```
yarn add "https://github.com/muxinc/mux-stats-sdk-react-native-video#v0.2.0"
```

OR

```
npm install "https://github.com/muxinc/mux-stats-sdk-react-native-video#v0.2.0" --save
```

## Usage

This package works by wrapping your `Video` component in a higher order component.

For more information about what keys can be passed into the `data` key in the `muxOptions` prop see
[the javascript docs](https://docs.mux.com/docs/web-integration-guide#section-5-add-metadata).

```jsx
import app from './package.json' // this is your application's package.json
import Video from 'react-native-video'; // import Video from react-native-video like your normally would
import muxReactNativeVideo from 'mux-react-native-video-sdk';

// wrap the `Video` component with Mux functionality
const MuxVideo = muxReactNativeVideo(Video);

// Pass the same props to `MuxVideo` that you would pass to the
// `Video` element. All of these props will be passed through to your underlying react-native-video component
// Include a new prop for `muxOptions`
<MuxVideo
  style={styles.video}
  source={{
    uri:
      'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
  }}
  controls
  muted
  muxOptions={{
    application_name: app.name,            // (required) the name of your application
    application_version: app.version,      // the version of your application (optional, but encouraged)
    data: {
      env_key: 'YOUR_ENVIRONMENT_KEY',     // (required)
      player_software_version: '5.0.2'     // (optional, but encouraged) the version of react-native-video that you are using
      player_name: 'React Native Player',  // See metadata docs for available metadata fields https://docs.mux.com/docs/web-integration-guide#section-5-add-metadata
      video_id: 'My Video Id',
      video_title: 'My awesome video',
    },
  }}
/>
```

## Known Issues

1. The `paused` property does not behave as expected on Android when using the default player controls. (the `onProgress` event, which is something the Mux SDK needs to hook into does not fire): https://github.com/react-native-community/react-native-video/issues/1979. If you are using the `paused` property it will work on iOS with the default controls but if you need to use it on Android you will have to implement your own controls and set/unset the `paused` property yourself.
1. The `player_is_fullscreen` property is not reported as expected on iOS. The react-native-video callbacks for fullscreen status `onFullscreenPlayerDidPresent` and `onFullscreenPlayerDidDismiss` do not get called when entering fullscreen using the native controls: https://github.com/react-native-video/react-native-video/issues/552

## Caveats

1. Upscale and downscale % metrics are not calculated because we are unable to get player width and player height measurments from react-native-video.
1. Even if we could get player width and height, we still wouldn't be able to calculate upscale and downscale % metrics for HLS sources is because of this open issue related to getting the video source width & height: https://github.com/react-native-community/react-native-video/issues/1194.
1. This library is intended for use with react-native-video when targeting iOS and Android platforms. For targeting web platforms we have other SDKs that will work better for monitiring the HTML5 `video` element.
1. If you are overriding react-native-video's default of 250ms for `progressUpdateInterval` this library will: (1) ignore your setting and revert back to 250ms (2) log a warning. This library depends on a progressUpdateInterval of 250ms in order to correctly calculate rebuffering
1. 'Seeking' events are not tracked by this SDK because of inconsistent `onSeek` callback behavior between iOS and Android: https://github.com/react-native-community/react-native-video/issues/1977
