# Weather Module

This module aims to be the replacement for the current `currentweather` and `weatherforcast` modules. The module will be configurable to be used as a current weather view, or to show the forecast. This way the module can be used twice to fulfill both purposes.

For configuration options, please check the [MagicMirror² documentation](https://docs.magicmirror.builders/modules/weather.html).

## Usage

To use this module, add it to the modules array in the `config/config.js` file:

````javascript
modules: [
	{
		module: "MMM-HK-Transport-ETA",
		position: "top_right",
		config: {
			// See 'Configuration options' for more information.
			transportETAProvider: 'mtr',
			sta: 'Hong Kong'
		}
	}
]
````


## Configuration options

The following properties can be configured:

### General options
| Option                       | Description
| ---------------------------- | -----------
| `transportETAProvider`            | Which ETA provider should be used. <br><br> **Possible values:** `mtr`, `kmb` ,`mtrbus` or `gmb`<br> **Default value:** `mtr`
| `reloadInterval`             | How often does the content needs to be fetched? (Milliseconds) <br><br> **Possible values:** `1000` - `86400000` <br> **Default value:** `60000` (1 minute)
| `updateInterval`   | How often do you want to display a relative time? (seconds). If set to `0`, the relative time would not be displayed.<br><br>  **Possible values:**`0` - `60000` <br> **Default value:** `5000` (5 seconds)
| `animationSpeed`   | Speed of the update animation. (Milliseconds) <br><br> **Possible values:**`0` - `5000` <br> **Default value:** `2500` (2.5 seconds)

### MTR

| Option                       | Description
| ---------------------------- | -----------
| `sta`                    | Which MTR station <br><br> **Possible values:** Please use the **stations.tc** or **stations.en** field of the [supported list of stations](https://codebeautify.org/jsonviewer?url=https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/mtr-lines.json)<br> **Default value:** `Hong Kong`

### KMB

| Option                       | Description
| ---------------------------- | -----------
| `sta`                    | Which KMB station <br><br> **Possible values:** Please use the **stations.tc** or **stations.en** field of the [supported list of stations](https://codebeautify.org/jsonviewer?url=https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/mtr-lines.json)<br> **Default value:** `Hong Kong`

### MTR Bus

| Option                       | Description
| ---------------------------- | -----------
| `line`                 | Which Bus line <br><br> **Possible values:** Please refer to **route_number** field of the [supported list of bus routes](https://codebeautify.org/jsonviewer?url=https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/routes-mtr.json), for example `K12`
| `sta`                    | Which Bus station <br><br> **Possible values:** Please refer to **line.stops.name_ch** or  **line.stops.name_en** field of the [supported list of bus routes](https://codebeautify.org/jsonviewer?url=https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/routes-mtr.json), for example `Tai Po Market Station` or `大埔墟站`

### Green Minibuses (GMB)

| Option                       | Description
| ---------------------------- | -----------
| `area`                 | Which area does the GMB belongs <br><br> **Possible values:**<br>- `HKI` for Hong Kong Island Line<br>- `KLN` for Kowloon Line<br>- `NT` for New Territories Line
| `line`                 | Which Bus line <br><br> **Possible values:**<br>- [Supported list of bus routes for Hong Kong Island GMB](https://data.etagmb.gov.hk/route/HKI)<br>- [Supported list of bus routes for Kowloon GMB](https://data.etagmb.gov.hk/route/KLN)<br>- [Supported list of bus routes for New Territories GMB](https://data.etagmb.gov.hk/route/NT)
| `sta`                    | Which GMB station <br><br> **Possible values:** This one is a bit hard<br>- Form the URL `https://codebeautify.org/jsonviewer?url=https://data.etagmb.gov.hk/route/{area}/{route}`<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;For example if you want to take Hong Kong Island GMB 12, then your URL is `https://codebeautify.org/jsonviewer?url=https://data.etagmb.gov.hk/route/HKI/12`.<br>In that page you will obtain `route_id` and `route_seq`<br><br>- Then form the URL `https://data.etagmb.gov.hk/route-stop/{route_id}/1` using the `route_id` obtained from the previous page, then you would obtain a list of 