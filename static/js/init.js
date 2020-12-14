
const inputFieldStates = {
    VISIBLE: 0,
    HIDDEN: 1,
}

jQuery(document).ready(function(){


	// Default password field state is Hidden
	let passwordDefaultState = inputFieldStates.HIDDEN;

	jQuery('.close-popup').on('click', function(){
		jQuery('.popup').fadeOut();
		return false;
	});

	jQuery('.hamburger-menu').on('click', function(){
		jQuery(this).toggleClass('active');
		jQuery('.main-menu').slideToggle();
	});

	jQuery(".formRow input").focus(function() {
	  jQuery(this).siblings(".formRow label").animate({ opacity: 1}, 800 );
	  jQuery(this).siblings(".formRow .inputLine").removeClass('active').animate({ width: '100%'}, 800 );
	});

	jQuery(".formRow input").focusout(function() {
	  //jQuery(this).siblings(".formRow .inputLine").addClass('active');
	  jQuery(this).siblings(".formRow .inputLine").animate({ width: 0}, 800 );;
	});


	jQuery(".formRow select").focus(function() {
	  jQuery(this).siblings(".formRow label").animate({ opacity: 1}, 800 );
	  jQuery(this).siblings(".formRow .inputLine").removeClass('active').animate({ width: '100%'}, 800 );
	});

	jQuery(".formRow select").focusout(function() {
	  jQuery(this).siblings(".formRow .inputLine").addClass('active');
	});

	jQuery(".show-password").click(function(){
		jQuery(this).toggleClass('active');
		if(jQuery(this).hasClass('active')){
			jQuery(this).prev('input').attr('type','text');
		}else{
			jQuery(this).prev('input').attr('type','password');
			}
	});

	/**
	 * Pesudo clicking the eye icon in case the default password field state is hidden
	 * == This state changes between scenarios
	 */
	if (passwordDefaultState == inputFieldStates.HIDDEN)
		jQuery(".show-password").trigger("click");


});

jQuery(window).load(function(){

	jQuery(".shield").css({ right:0 });
	jQuery(".shield").attr("data-t-shield", "");


	var rangeSlider = function(){
  var slider = $('.range-slider'),
      range = $('.range-slider__range'),
      value = $('.range-slider__value');

  slider.each(function(){

    value.each(function(){
      var value = $(this).prev().attr('value');
      $(this).html(value);
    });

    range.on('input', function(){
      $(this).parents('.range-slider').find('.slider__value',value).html(this.value);
    });
  });
};

rangeSlider();

	jQuery('.inline-popup-close').click(function(){
		//jQuery('.inline-popup').fadeOut();
		//jQuery('.inline-popup').removeClass('active');
		return false;
	});

	jQuery('.inline-popup-open').click(function(){
		jQuery('.inline-popup').fadeIn();
		jQuery('.inline-popup').addClass('active');
		return false;
	});

	jQuery('.inline-popup-close-2').click(function(){
		//jQuery('.inline-popup').fadeOut();
		//jQuery('.inline-popup').removeClass('active');
		return false;
	});

	jQuery('.inline-popup-open-2').click(function(){
		jQuery('.inline-popup-2').fadeIn();
		jQuery('.inline-popup-2').addClass('active');
		return false;
	});

  jQuery('#pw2').focusout(function(){
    var pw1 = $('#pw1').val();
    var pw2 = $('#pw2').val();
    if(pw2 && pw1 != pw2){
      $('#pw1').parent().addClass('inputError');
      $('#pw2').parent().addClass('inputError');
      $('#createSubmit').attr('disabled', true);
    } else {
      $('#pw1').parent().removeClass('inputError');
      $('#pw2').parent().removeClass('inputError');
      $('#createSubmit').attr('disabled', false);
    }
   });

    jQuery('#pw1').focusout(function(){
      var pw1 = $('#pw1').val();
      var pw2 = $('#pw2').val();
      if(pw2 && pw1 != pw2){
        $('#pw1').parent().addClass('inputError');
        $('#pw2').parent().addClass('inputError');
        $('#createSubmit').attr('disabled', true);
      } else {
        $('#pw1').parent().removeClass('inputError');
        $('#pw2').parent().removeClass('inputError');
        $('#createSubmit').attr('disabled', false);
      }
    });




	/* ---------------------------------------
  	Shop and Airline jQuery [ 30:3:2019 ]
	--------------------------------------------------------------------------- */

	jQuery(".sa_formRow input").focus(function() {
	  jQuery(this).siblings(".sa_formRow label").animate({ opacity: 1}, 800 );
	  jQuery(this).siblings(".sa_formRow .sa_inputLine").removeClass('sa_active').animate({ width: '100%'}, 800 );
	});

	jQuery(".sa_formRow input").focusout(function() {
	  jQuery(this).siblings(".sa_formRow .sa_inputLine").addClass('sa_active');
	});

	jQuery(".sa_formRow select").focus(function() {
	  jQuery(this).siblings(".sa_formRow label").animate({ opacity: 1}, 800 );
	  jQuery(this).siblings(".sa_formRow .sa_inputLine").removeClass('sa_active').animate({ width: '100%'}, 800 );
	});

	jQuery(".sa_formRow select").focusout(function() {
	  jQuery(this).siblings(".sa_formRow .inputLine").addClass('sa_active');
	});


	jQuery(".sa_show-password").click(function(){
		jQuery(this).toggleClass('sa_active');
		if(jQuery(this).hasClass('sa_active')){
			jQuery(this).prev('input').attr('type','text');
		}else{
			jQuery(this).prev('input').attr('type','password');
			}
	});


	setTimeout(function(){
		jQuery(".sa_shield").addClass('sa_active');
	 }, 1000);

	 jQuery('.sa_mobile-nav').click(function(){
		jQuery(this).toggleClass('sa_active');
		jQuery('.sa_header-main').slideToggle();
	});


	  if($.isFunction(jQuery('.sa_banner-carousel').owlCarousel)){
		jQuery('.sa_banner-carousel').owlCarousel({
			loop:true,
			margin:0,
			nav:false,
			dots:true,
			autoplay:true,
			autoplayTimeout:5000,
			autoplayHoverPause:true,
			items:1
		});
	  }


	/* ---------------------------------------
  	Shop and Airline jQuery end [ 30:3:2019 ]
	--------------------------------------------------------------------------- */


});
