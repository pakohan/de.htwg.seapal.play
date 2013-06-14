/* trip_info.js */

$(document).ready(function() {

	loadAllTrips();

	$("#tripListTable tbody").hide();

	$('#deleteModalBtn').click(function(event) {
		event.preventDefault();
		var id = $('#deletePromptModal').attr("data-id");
		deleteItem(id);		
	});

	function deleteItem(itemId){
		jsRoutes.de.htwg.seapal.web.controllers.TripAPI.deleteTrip(itemId).ajax({
			dataType: "json",
			success: function(data) {
				loadAllTrips();
			}
		});
	}

	function populateJSON( item, data){
		var $inputs = $(item);
		$.each(data, function(key, value) {
		  $inputs.filter(function() {
		    return key == this.name;
		  }).val(value);
		});
	}

    $('body').on('click', 'a.deleteItemBtn', function(event) {
	        event.preventDefault();

	        var id = $(this).closest('tr').attr("data-id");

	        if(id != ""){
	        	$('#deletePromptModal').attr("data-id", id);
	        	$('#deletePromptModal .modal-body span').html(id);
	        	$('#deletePromptModal').modal('show');
	        }
    });

    $('body').on('click', 'a.editItemBtn', function(event) {
	        event.preventDefault();

	        var id = $(this).closest('tr').attr("data-id");

	        if(id != ""){
	        	window.location.href = jsRoutes.de.htwg.seapal.web.controllers.Application.trip_edit(id).url;
	        }
    });
    
    $('body').on('click', '#continueButton', function(event) {
        event.preventDefault();
        console.log($('#form'));
        $('#form').validate();
        //$('#form').submit();
    });

	function loadAllTrips() {
		var route = jsRoutes.de.htwg.seapal.web.controllers.TripAPI.allTripsAsJson();

		route.ajax({
			dataType: "json",
			success: function(data) {
				$( "#tripListTable tbody" ).html(
					$( "#tripListTemplate" ).render(data)
				);

				$('.tooltipable').tooltip();
				$('#tripListTable').paginateTable({ rowsPerPage: 10, pager: ".tablePager", autoHidePager: false });
				$("#tripListTable tbody").show('slow');
			}
		});
	}
});

