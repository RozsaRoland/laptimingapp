import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Button } from 'react-native';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';

const LapTimerWithGPS = () => {
  const [timer, setTimer] = useState(0);
  const [laps, setLaps] = useState([]);
  const [compassDirection, setCompassDirection] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [speed, setSpeed] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const SpeedSensor = () => {
    

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            setPermissionStatus(status);
            if (status !== 'granted') {
                alert('Permission to access location was denied');
                return;
            }

            const subscription = await Location.watchPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 1000, // Update every second
                distanceInterval: 1, // or every 1 meter
            }, (location) => {
                // Check if speed is available and not null
                if (location.coords && typeof location.coords.speed === 'number') {
                    setSpeed(location.coords.speed * 3.6); // Convert m/s to km/h
                } else {
                    setSpeed(0); // Default or stationary speed
                }
            });

            return () => {
                subscription.remove();
            }
        })();
    });
  };
  useEffect(() => {
    const magSubscription = Magnetometer.addListener(magnetometerData => {
      calculateCompassDirection(magnetometerData);
    });

    return () => {
      magSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const accelerometerSubscription = Accelerometer.addListener(data => {
      const { x, z } = data;
      const maxAcceleration = 2;

      const safeX = isFinite(x) ? x : 0;
      const safeZ = isFinite(z) ? z : 0;
      const verticalPosition = Math.min(Math.max(safeZ / maxAcceleration, -1), 1) * 50;
      const horizontalPosition = Math.min(Math.max(safeX / maxAcceleration, -1), 1) * 50;

      setPosition({ x: horizontalPosition, y: verticalPosition });
    });

    return () => {
      accelerometerSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimer(Date.now() - startTime);
      }, 10);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning, startTime]);

  const startTimer = useCallback(() => {
    setStartTime(Date.now() - timer);
    setTimerRunning(true);
  }, [timer]);

  const stopTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setTimer(0);
    setLaps([]);
    setStartTime(0);
    setTimerRunning(false);
  }, []);

  const recordLap = useCallback(() => {
    const lapTime = Date.now() - startTime;
    setLaps(prevLaps => [...prevLaps, lapTime]);
  }, [startTime]);

  const calculateCompassDirection = useCallback(({ x, y }) => {
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    setCompassDirection(directions[Math.round((angle < 0 ? 360 + angle : angle) / 45) % 8]);
  }, []);

  const formatTime = useCallback(timeInMillis => {
    const hours = Math.floor(timeInMillis / 3600000);
    const minutes = Math.floor((timeInMillis % 3600000) / 60000);
    const seconds = Math.floor((timeInMillis % 60000) / 1000);
    const milliseconds = Math.floor(timeInMillis % 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Roland's Laptimer</Text>
      </View>
      <View style={styles.overlay}>
        <Text style={styles.timer}>{formatTime(timer)}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => timerRunning ? stopTimer() : startTimer()}>
            <Text style={styles.buttonText}>{timerRunning ? 'Stop' : 'Start'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={resetTimer}>
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={recordLap}>
            <Text style={styles.buttonText}>Lap</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.lapContainer}>
          <ScrollView>
            {laps.map((lap, index) => (
              <View key={index} style={styles.lapRow}>
                <Text style={styles.lapText}>
                  Lap {index + 1}: {formatTime(lap)} seconds
                </Text>
                {index > 0 && (
                  <Text style={styles.lapDifference}>
                    Difference: {formatTime(lap - laps[index - 1])} seconds
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={styles.compass}>
        <Feather name="compass" size={48} color="white" style={{ transform: [{ rotate: `${compassDirectionToDegrees(compassDirection)}deg` }] }} />
        <Text style={styles.compassText}>{compassDirection}</Text>
      </View>
      <View style={styles.gaugeContainer}>
        <View style={styles.gauge}>
        <View style={[styles.point, { bottom: 50 + position.y, left: 50 + position.x }]} />
        </View>
      </View>
      <View style={styles.speedContainer}>
            <Text style={styles.text}>
                Current Speed: {speed !== null ? speed.toFixed(2) : 'Unavailable'} km/h
            </Text>
        </View>
    </View>
  );
};

const compassDirectionToDegrees = (direction) => {
  const degrees = {
    'N': 0, 'NE': 45, 'E': 90, 'SE': 135, 'S': 180, 'SW': 225, 'W': 270, 'NW': 315
  };
  return degrees[direction] || 0;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 135,
    backgroundColor: '#333',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f1f1f',
  },
  timer: {
    fontSize: 64,
    marginBottom: 20,
    color: '#ffffff',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  button: {
    padding: 10,
    margin: 5,
    backgroundColor: '#007bff',
    borderRadius: 5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  lapContainer: {
    flex: 1,
    width: '100%',
  },
  lapRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  lapText: {
    fontSize: 16,
    color: '#ffffff',
  },
  lapDifference: {
    fontSize: 14,
    color: '#d3d3d3',
  },
  compass: {
    position: 'absolute',
    top: 50,
    right: 20,
    alignItems: 'center',
  },
  compassText: {
    color: 'white',
    fontSize: 16,
  },
  gaugeContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gauge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#000',
    borderWidth: 2,
  },
  point: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    position: 'absolute',
  },
  speedContainer: {
    position: 'absolute', // Position the speed container absolutely
    bottom: 20, // Distance from bottom
    right: 20, // Distance from right
    width: 100, // Width of the speed container
    height: 50, // Height of the speed container
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    elevation: 5,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowColor: '#000',
    shadowOffset: { height: 1, width: 0 },
},
  text: {
    fontSize: 18,
    color: '#333',
  },
});

export default LapTimerWithGPS;
