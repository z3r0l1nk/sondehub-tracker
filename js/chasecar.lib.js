/* Habitat ChaseCar lib
 * Uploads geolocation for chase cars to habitat
 *
 * Author: Rossen Gerogiev
 * Requires: jQuery
 * 
 * Updated to SondeHub v2 by Mark Jessop
 */

ChaseCar = {
    db_uri: "https://api.v2.sondehub.org/listeners",   // Sondehub API
    recovery_uri: "https://api.v2.sondehub.org/recovered",
};

// Updated SondeHub position upload function.
// Refer PUT listeners API here: https://generator.swagger.io/?url=https://raw.githubusercontent.com/projecthorus/sondehub-infra/main/swagger.yaml
// @callsign string
// @position object (geolocation position object)
ChaseCar.updatePosition = function(callsign, position) {
    if(!position || !position.coords) return;

    // Set altitude to zero if not provided.
    _position_alt = ((!!position.coords.altitude) ? position.coords.altitude : 0);

    var _doc = {
        "software_name": "SondeHub Tracker",
        "software_version": "{VER}",
        "uploader_callsign": callsign,
        "uploader_position": [position.coords.latitude, position.coords.longitude, _position_alt],
        "uploader_antenna": "Mobile Station",
        "uploader_contact_email": "none@none.com",
        "mobile": true
    };

    // push the doc to sondehub
    $.ajax({
            type: "PUT",
            url: ChaseCar.db_uri,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            data: JSON.stringify(_doc),
    });
};


ChaseCar.markRecovered = function(){

    _run_checks = true;
    _range_limit = 50000; // 50 km

    // Get the serial number to be marked recovered
    _serial = $("#pr_serial").val().trim();

    // Check it exists.
    if(_serial.includes("chase") && _run_checks){
        $('#pr_last_report').text("Invalid sonde callsign.");
        return;
    }
    if(!vehicles.hasOwnProperty(_serial) && _run_checks){
        $('#pr_last_report').text("Invalid sonde callsign.");
        return;
    }

    // Now get the last position of the sonde.
    _sonde = {
        'lat':vehicles[_serial].curr_position['gps_lat'],
        'lon':vehicles[_serial].curr_position['gps_lon'],
        'alt':0.0
    };

    // Now get the chaser position.
    _chaser = {
        'lat': parseFloat($('#cc_lat').text()),
        'lon': parseFloat($('#cc_lon').text()),
        'alt': 0.0
    };

    // Calculate the distance from the sonde
    _lookangles = calculate_lookangles(_chaser, _sonde);

    if( (_lookangles.range > _range_limit ) && _run_checks){
        $('#pr_last_report').text("Outside distance limit.");
        return;
    }

    // We are close enough!
    _callsign = $("#cc_callsign").val().trim();
    if (_callsign == "" || _callsign == undefined || _callsign.length == 0)
    {
        $('#pr_last_report').text("Enter a callsign!");
        return;
    }
    
    _notes = $("#pr_notes").val().trim();

    if($("#sw_use_car_pos").hasClass('on')){
        _recov_lat = parseFloat($('#cc_lat').text());
        _recov_lon = parseFloat($('#cc_lon').text());
    } else {
        _recov_lat = vehicles[_serial].curr_position['gps_lat'];
        _recov_lon = vehicles[_serial].curr_position['gps_lon'];
    }

    var _doc = {
        "serial": _serial,
        "lat": _recov_lat,
        "lon": _recov_lon,
        "alt": vehicles[_serial].curr_position['gps_alt'],
        "recovered": $("#sw_recovery_ok").hasClass('on'),
        "recovered_by": _callsign,
        "description": _notes
    };

    // Yes this is not the right way to do this...
    // .. but it adds an extra bit of check.
    var res = grecaptcha.getResponse();
    if (res == "" || res == undefined || res.length == 0)
    {
        $('#pr_last_report').text("Do Recaptcha first!");
        return;
    }

    $.ajax({
        type: "PUT",
        url: ChaseCar.recovery_uri,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(_doc),
    }).done(function(data) {
        console.log(data);
        $('#pr_last_report').text("Reported OK!");
    })
    .fail(function(jqXHR, textStatus, error) {
        try {
            _fail_resp = JSON.parse(jqXHR.responseText);
            $('#pr_last_report').text(_fail_resp.message);
        } catch(err) {
            $('#pr_last_report').text("Failed to report.");
        }
    })

}