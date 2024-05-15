import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Button, Dimensions } from 'react-native';
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
  const [subscription, setSubscription] = useState(null);
  const [magnetometer, setMagnetometer] = useState(0);

  
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

  const formatTime = useCallback(timeInMillis => {
    const hours = Math.floor(timeInMillis / 3600000);
    const minutes = Math.floor((timeInMillis % 3600000) / 60000);
    const seconds = Math.floor((timeInMillis % 60000) / 1000);
    const milliseconds = Math.floor(timeInMillis % 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }, []);

  useEffect(() => {
    toggle_();
    return () => {
      unsubscribe_();
    };
  }, []);

  const toggle_ = () => {
    if (subscription) {
      unsubscribe_();
    } else {
      subscribe_();
    }
  };

  const subscribe_ = () => {
    setSubscription(
      Magnetometer.addListener((data) => {
        setMagnetometer(angle_(data));
      })
    );
  };

  const unsubscribe_ = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  const angle_ = (magnetometer) => {
    let angle = 0;
    if (magnetometer) {
      let { x, y, z } = magnetometer;
      if (Math.atan2(y, x) >= 0) {
        angle = Math.atan2(y, x) * (180 / Math.PI);
      } else {
        angle = (Math.atan2(y, x) + 2 * Math.PI) * (180 / Math.PI);
      }
    }
    return Math.round(angle);
  };

  const direction_ = (degree) => {
    if (degree >= 22.5 && degree < 67.5) {
      return 'NE';
    }
    else if (degree >= 67.5 && degree < 112.5) {
      return 'E';
    }
    else if (degree >= 112.5 && degree < 157.5) {
      return 'SE';
    }
    else if (degree >= 157.5 && degree < 202.5) {
      return 'S';
    }
    else if (degree >= 202.5 && degree < 247.5) {
      return 'SW';
    }
    else if (degree >= 247.5 && degree < 292.5) {
      return 'W';
    }
    else if (degree >= 292.5 && degree < 337.5) {
      return 'NW';
    }
    else {
      return 'N';
    }
  };

  const degree_ = (magnetometer) => {
    return magnetometer - 90 >= 0 ? magnetometer - 90 : magnetometer + 271;
  };

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
      <Feather name="compass" size={48} color="white" />
        <Text style={styles.compassText}>{direction_(degree_(magnetometer))}</Text>
      </View>
      <View style={styles.gaugeContainer}>
        <View style={styles.gauge}>
        <View style={[styles.point, { bottom: 50 + position.y, left: 50 + position.x }]} />
        </View>
      </View>
    </View>
  );
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
});

export default LapTimerWithGPS;
