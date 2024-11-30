import { generateClient } from 'aws-amplify/data';
import { Schema } from '../../../amplify/data/resource';

const client = generateClient<Schema>();

export type UserType = {
  username: string;
  attributes?: {
    name?: string;
    'custom:organization'?: string;
  };
  signInDetails?: {
    loginId: string;
  };
};

export interface ProfilePageProps {
  user: string;
  email: string;
  attributes?: {
    name?: string;
    'custom:organization'?: string;
  };
}

export const defaultUser: UserType = {
  username: 'guest',
  signInDetails: {
    loginId: 'guest@example.com'
  },
  attributes: {
    name: 'Guest User',
    'custom:organization': 'Guest Org'
  }
};

export const convertAuthToUserType = (authUser: any): UserType => {
  return {
    username: authUser?.username || 'guest',
    signInDetails: {
      loginId: authUser?.signInDetails?.loginId || 'guest@example.com'
    },
    attributes: {
      name: authUser?.attributes?.name || '',
      'custom:organization': authUser?.attributes?.['custom:organization'] || ''
    }
  };
};

export const getProfileProps = (user: UserType): ProfilePageProps => {
  return {
    user: user?.username || 'guest',
    email: user?.signInDetails?.loginId || '',
    attributes: user?.attributes
  };
};

export const createOrUpdateProfile = async (user: UserType) => {
  try {
    const { data: existingProfile } = await client.models.Profile.get({ 
      id: user.username 
    });

    if (!existingProfile) {
      await client.models.Profile.create({
        id: user.username,
        userId: user.username,
        name: user.attributes?.name || user.signInDetails?.loginId,
        organization: user.attributes?.['custom:organization'] || 'AWS',
        point: 0
      });
      console.log('New profile created');
    }
  } catch (error) {
    console.error('Error handling profile:', error);
  }
};