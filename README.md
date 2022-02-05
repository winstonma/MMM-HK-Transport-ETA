# MMM-HK-Transport-ETA Module

Estimated Time of Arrival (ETA) for the Hong Kong Transport. It uses the API provided by [DATA.GOV.HK](https://data.gov.hk/) and support several Hong Kong transport.

This module aims to be the replacement the [MMM-HK-KMB](https://github.com/winstonma/MMM-HK-KMB) and [MMM-HK-Transport](https://github.com/winstonma/MMM-HK-Transport) modules.

## Prerequisite
A working installation of [MagicMirror<sup>2</sup>](https://github.com/MichMich/MagicMirror)
 
## Dependencies
  * npm
  * [js-kmb-api](https://github.com/miklcct/js-kmb-api)

## Installation
To add this module, go to MagicMirror folder and run the following command
```bash
cd modules
git clone --recurse-submodules https://github.com/winstonma/MMM-HK-Transport-ETA.git
cd MMM-HK-Transport-ETA
npm install
```

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
| `transportETAProvider`            | Which ETA provider should be used. <br><br> **Possible values:** `mtr`, `kmb` ,`mtrbus`, `lrt` or `gmb`<br> **Default value:** `mtr`
| `reloadInterval`             | How often does the content needs to be fetched? (Milliseconds) <br><br> **Possible values:** `1000` - `86400000` <br> **Default value:** `60000` (1 minute)
| `updateInterval`   | How often do you want to display a relative time? (seconds). If set to `0`, the relative time would not be displayed.<br><br>  **Possible values:** `0` - `60000` <br> **Default value:** `5000` (5 seconds)
| `animationSpeed`   | Speed of the update animation. (Milliseconds) <br><br> **Possible values:** `0` - `5000` <br> **Default value:** `2500` (2.5 seconds)
| `showHeader`       | Display the header. <br><br> **Possible values:** `true` or `false` <br> **Default value:** `false`

### MTR

| Option                       | Description
| ---------------------------- | -----------
| `sta`                    | Which MTR station <br><br> **Possible values:** Please use the **stations.tc** or **stations.en** field of the [supported list of stations](https://codebeautify.org/jsonviewer?url=https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/mtr-lines.json)<br> **Default value:** `Hong Kong`

### KMB

| Option                       | Description
| ---------------------------- | -----------
| `sta`                    | Which KMB station <br><br> **Possible values:**<br>1. Open your web browser and navigate to the [kmb_eta](https://miklcct.com/kmb_eta/) page, developed by miklcct.<br>2. In the `Enter the route number:` box, enter the KMB Bus route number that passes the stop. Then press the submit button. The destination and the home would be displayed.<br>3. After the submit of the bus route, the route origin and destination would be displayed. Choose the right direction by clicking the `Switch direction` button.<br>4. In the `Choose a route variant:` infobox, select the variant.<br>5. In the `Choose a stop in the list:` infobox, there is a list of stops with the `stopID` displayed in the bracket. Fill the `sta` in the `config.js`.

### MTR Bus

| Option                       | Description
| ---------------------------- | -----------
| `line`                 | Which Bus line <br><br> **Possible values:** Please refer to **route_number** field of the [supported list of bus routes](https://codebeautify.org/jsonviewer?url=https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/routes-mtr.json), for example `K12`
| `sta`                    | Which Bus station <br><br> **Possible values:** Please refer to **line.stops.name_ch** or  **line.stops.name_en** field of the [supported list of bus routes](https://codebeautify.org/jsonviewer?url=https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/routes-mtr.json), for example `Tai Po Market Station` or `大埔墟站`

### Light Rail Transit (LRT)

| Option                       | Description
| ---------------------------- | -----------
| `sta`                    | Which LRT station <br><br> **Possible values:** Please refer to **eng_name** or  **chi_name** field of the [supported list of lrt station](https://codebeautify.org/jsonviewer?url=https://raw.githubusercontent.com/kirosc/telegram-hketa/master/data/station-lrt.json), for example `Lung Mun` or `龍門`

### Green Minibuses (GMB)

| Option                       | Description
| ---------------------------- | -----------
| `area`                 | Which area does the GMB belongs <br><br> **Possible values:**<br>- `HKI` for Hong Kong Island Line<br>- `KLN` for Kowloon Line<br>- `NT` for New Territories Line
| `line`                 | Which Bus line <br><br> **Possible values:**<br>- [Supported list of bus routes for Hong Kong Island GMB](https://data.etagmb.gov.hk/route/HKI)<br>- [Supported list of bus routes for Kowloon GMB](https://data.etagmb.gov.hk/route/KLN)<br>- [Supported list of bus routes for New Territories GMB](https://data.etagmb.gov.hk/route/NT)
| `sta`                    | Which GMB station <br><br> **Possible values:** Please follow the steps below to obtain the stop name<br>1. Form the URL `https://codebeautify.org/jsonviewer?url=https://data.etagmb.gov.hk/route/{area}/{line}` using the  `area` and `line` in the above config.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;For example if you want to obtain a specific stop of Hong Kong Island GMB Line 12, then your URL is `https://codebeautify.org/jsonviewer?url=https://data.etagmb.gov.hk/route/HKI/12`.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;In this page you will obtain **route_id**<br>2. Then form the URL `https://codebeautify.org/jsonviewer?url=https://data.etagmb.gov.hk/route-stop/{route_id}/1` using the **route_id** obtained from the previous step, then you would obtain a list of stops.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;In this page you would obtain **stop_id** of your desired stop. Place it in `sta` would do.