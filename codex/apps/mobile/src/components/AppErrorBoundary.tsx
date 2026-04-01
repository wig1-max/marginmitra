import { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      error
    };
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong in this screen</Text>
        <Text style={styles.body}>{this.state.error.message}</Text>
        <Pressable
          style={styles.button}
          onPress={() => this.setState({ error: null })}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink900,
    marginBottom: spacing.sm
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink700,
    marginBottom: spacing.lg
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ink900,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  }
});
