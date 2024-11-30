import { useState } from "react";
import { TopNavigation } from "@cloudscape-design/components";
import { Mode } from "@cloudscape-design/global-styles";
import { StorageHelper } from "../common/helpers/storage-helper";
import { APP_NAME } from "../common/constants";

import { TopNavigationProps } from "@cloudscape-design/components";

export default function GlobalHeader(props: any) {
  const [theme, setTheme] = useState<Mode>(StorageHelper.getTheme());

  const onChangeThemeClick = () => {
    if (theme === Mode.Dark) {
      setTheme(StorageHelper.applyTheme(Mode.Light));
    } else {
      setTheme(StorageHelper.applyTheme(Mode.Dark));
    }
  };

  const utilities: TopNavigationProps.Utility[] = [
    {
      type: "button" as const,
      text: theme === Mode.Dark ? "Light Mode" : "Dark Mode",
      onClick: onChangeThemeClick,
    }
  ];

  if (props.isAuthenticated && props.signOut) {
    utilities.push(
      {
        type: 'menu-dropdown' as const,
        text: (props.user).split('@')[0],
        description: props.user,
        iconName: 'user-profile',
        items: []
      } as TopNavigationProps.MenuDropdownUtility,
      {
        type: "button" as const,
        text: "Sign out",
        onClick: props.signOut,
      }
    );
  }

  return (
    <div
      style={{ zIndex: 1002, top: 0, left: 0, right: 0, position: "fixed" }}
      id="awsui-top-navigation"
    >
      <TopNavigation
        identity={{
          href: '#',
          title: `🤖 ${APP_NAME}`,
        }}
        utilities={utilities}
      />
    </div>
  );
}