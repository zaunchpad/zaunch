'use client';

import { Navbar } from 'nextra-theme-docs';
import { Group, Text, useMantineColorScheme } from '@mantine/core';
import { ColorSchemeControl } from '../ColorSchemeControl/ColorSchemeControl';
import { Logo } from '../Logo/Logo';
import { MantineNextraThemeObserver } from '../MantineNextraThemeObserver/MantineNextraThemeObserver';

/**
 * You can customize the Nextra NavBar component.
 * Don't forget to use the MantineProvider and MantineNextraThemeObserver components.
 *
 * @since 1.0.0
 *
 */
export const MantineNavBar = () => {
  const { colorScheme } = useMantineColorScheme();
  
  return (
    <>
      <MantineNextraThemeObserver />
      <Navbar
        logo={
          <Group align="center" gap={8}>
            <Logo />
            <Text 
              size="lg" 
              fw={800} 
              c={colorScheme === 'light' ? 'black' : 'white'} 
              visibleFrom="xl"
            >
              ZAUNCHPAD
            </Text>
          </Group>
        }
        projectLink="https://github.com/zaunchpad/zaunchpad"
      >
        <ColorSchemeControl />
      </Navbar>
    </>
  );
};
