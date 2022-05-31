'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Menu selectors
const workoutContainer = document.querySelector('.workout');
const menuCardContainer = document.querySelector('.menu--card-container');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  click = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // km
    this.duration = duration; // min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  clicks() {
    this.click++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // measured in min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // measured in kh/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const run = new Running([12, -3], 300, 4000, 23);

/**************************/
/* CLASS APP ARCHITECTURE */
/*************************/

class App {
  #mapEvent;
  #map;
  #zoomValue = 13;
  #workouts = [];

  constructor() {
    // Get users position
    // Example 2.
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Event Handlers
    // this is a submit event hence whenever the user clicks enter the event is triggered
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Event handler to toggle the input type. Does not need the bind because there are not this keywords used in the code
    inputType.addEventListener('change', this._toggleElevationField);

    // Moving the map to the markup position as it is clicked
    containerWorkouts.addEventListener('click', this._goToPopup.bind(this));

    // Show menu
    containerWorkouts.addEventListener('click', this._showMenu);
  }

  _getPosition() {
    // This is the geolocation API that is present in the browser for our use. Requires two callback functions for success and failure
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      );
  }

  _loadMap(position) {
    const [latitude, longitude] = [
      position.coords.latitude,
      position.coords.longitude,
    ];

    const coords = [latitude, longitude];
    // console.log(coords);

    // the second parameter is the zoom number
    this.#map = L.map('map').setView(coords, this.#zoomValue);
    // console.log(map);

    // replacing org with fr/hot changes the map look
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling Clicks on map
    this.#map.on('click', this._showForm.bind(this));

    // This adds the map icon for the work object stored in the local storage. It is positioned here because for the map marker to show the map has to load first and this function ensures the maps loads (Asynchronous JS)
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    // We do this to the map Event because we do not need it here. We need below in the form event
    this.#mapEvent = mapE;

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // submit clear input fields
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    // hide form (confusing - I get the concept but I would not have thought of it)
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 300);
  }

  _toggleElevationField() {
    // Closest is a means to perform DOM traversal which selects the closest parent with the specified class name (an inverse query Selector)
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInput = (...input) => input.every(int => Number.isFinite(int));
    // const validInput = (...input) => input.every(int => !Number.isNaN(int)); // Another way ⬆
    const positiveNum = (...input) => input.every(int => int > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Workout running - Create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid

      if (
        // !Number.isFinite(cadence) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(distance)
        !validInput(distance, cadence, duration) ||
        !positiveNum(distance, cadence, duration)
      )
        return alert('That is not a valid number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // workout cycling - create running object
    if (type === 'cycling') {
      const eleGain = +inputElevation.value;
      // Check if data is valid
      if (
        !validInput(duration, eleGain, distance) ||
        !positiveNum(distance, duration)
      )
        return alert('That is not a valid number');

      workout = new Cycling([lat, lng], distance, duration, eleGain);
    }

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // add new object to workout array
    this.#workouts.push(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form and clear input field
    this._hideForm();

    // set local storage on workout
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 50,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}  ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <div class="menu--container"> 
          <div class="menu--bar">
          <ion-icon name="menu-outline"></ion-icon>
          </div>

          <div class="menu--card-container menu--hidden">
            <div class="menu--card">
              <ul class="menu--card-list">
                <li><ion-icon name="create-outline"></ion-icon>edit</li>
                <li><ion-icon name="trash-outline"></ion-icon>delete</li>
                <li><ion-icon name="trash-outline"></ion-icon>delete all</li>
                <li><ion-icon name="funnel-outline"></ion-icon>sort by date</li>
              </ul>
            </div>
          </div>
          </div>

          <h2 class="workout__title">${workout.type} on April 14</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${workout.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
        </li>
        `;

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _goToPopup(e) {
    const workEl = e.target.closest('.workout');

    if (!workEl) return;

    const workout = this.#workouts.find(ele => ele.id === workEl.dataset.id);

    this.#map.setView(workout.coords, this.#zoomValue, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.clicks(); // Disabled because local storage did not inherit its method
  }

  _showMenu() {}

  _setLocalStorage() {
    // using the local storage API (use for small amounts of data - if not it will slow application)
    // Convert an object to a string by doing JSON.stringify
    // The localStorage takes two parameters, a key(string - anyname that describes the object) and value(object but in string format)
    localStorage.setItem('workout', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workout'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workout');
    // location is an object with many methods attached to it.
    location.reload();
  }
}

const app = new App();

// There can be two ways of calling the methods in the class
// Example 1.
// app._getPosition();
