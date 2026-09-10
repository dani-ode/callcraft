import {
  ICredentialType,
  INodeProperties,
  IAuthenticateGeneric,
  ICredentialTestRequest,
} from 'n8n-workflow';

export class CallcraftApi implements ICredentialType {
  name = 'callcraftApi';
  displayName = 'Callcraft API';
  documentationUrl = 'https://github.com/callcraft';
  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'http://localhost:8081',
      description: 'Callcraft API Base URL (e.g. http://localhost:8081 or your production host)',
      required: true,
    },
    {
      displayName: 'User ID',
      name: 'userId',
      type: 'string',
      default: '',
      placeholder: 'usr_01HZX89ABCDEF1234567890XY',
      description: 'Your Callcraft User ID (from Dashboard -> Settings or profile)',
      required: true,
    },
    {
      displayName: 'Public Key',
      name: 'publicKey',
      type: 'string',
      default: '',
      placeholder: 'pk_live_...',
      description: 'Your Callcraft Credential Public Key (from Dashboard -> API Keys)',
      required: true,
    },
    {
      displayName: 'Secret Key',
      name: 'secretKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      placeholder: 'call_sk_live_...',
      description: 'Your Callcraft Credential Secret Key (shown upon API Key creation)',
      required: true,
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'X-USER-ID': '={{$credentials.userId}}',
        'X-CALL-PUBLIC-KEY': '={{$credentials.publicKey}}',
        Authorization: '=Bearer {{$credentials.secretKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/v1/projects',
      method: 'GET',
    },
  };
}
