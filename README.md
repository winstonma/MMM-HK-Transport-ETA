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
            line: 'TML',
            sta: 'MOS'
		}
	}
]
````


## Configuration options

The following properties can be configured:

### General options
| Option                       | Description
| ---------------------------- | -----------
| `transportETAProvider`            | Which ETA provider should be used. <br><br> **Possible values:** `mtr` or `mtrbus`<br> **Default value:** `mtr`

### MTR

| Option                       | Description
| ---------------------------- | -----------
| `line`                 | Which MTR line <br><br> **Possible values:** `AEL` for Airport Express<br> **Default value:** `TML` for Tuen Ma Line
| `sta`                    | Which MTR station <br><br> **Possible values:** Please refer to [MTR Train Data Dictionaries](https://opendata.mtr.com.hk/doc/Next_Train_DataDictionary.pdf)<br> **Default value:** `MOS` for Ma On Shan

### MTR Bus

| Option                       | Description
| ---------------------------- | -----------
| `line`                 | Which Bus line <br><br> **Possible values:** Please refer to [MTR Bus Data Dictionaries](https://opendata.mtr.com.hk/doc/MTR_BUS_DataDictionary_v1.0.pdf)<br> **Default value:** `506` for Tuen Ma Line
| `sta`                    | Which Bus station <br><br> **Possible values:** Please refer to [MTR Bus Data Dictionaries](https://opendata.mtr.com.hk/doc/MTR_BUS_DataDictionary_v1.0.pdf)<br> **Default value:** `MOS` for Ma On Shan
