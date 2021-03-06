jest.mock(`fs`, () => {
  const fs = jest.requireActual(`fs`)
  return {
    ...fs,
    readFileSync: jest.fn(file => `${file}::file`),
  }
})
jest.mock(`gatsby-cli/lib/reporter`, () => {
  return {
    panic: jest.fn(),
    info: jest.fn(),
  }
})
jest.mock(`devcert`, () => {
  return {
    certificateFor: jest.fn(),
  }
})

const getDevCert = require(`devcert`).certificateFor
const reporter = require(`gatsby-cli/lib/reporter`)
const getSslCert = require(`../get-ssl-cert`)

describe(`gets ssl certs`, () => {
  beforeEach(() => {
    reporter.panic.mockClear()
    reporter.info.mockClear()
    getDevCert.mockClear()
  })
  describe(`Custom SSL certificate`, () => {
    it.each([[{ certFile: `foo` }], [{ keyFile: `bar` }]])(
      `panic if cert and key are not both included`,
      args => {
        getSslCert(args)

        expect(reporter.panic.mock.calls).toMatchSnapshot()
      }
    )
    it(`loads a cert relative to a directory`, () => {
      expect(
        getSslCert({
          name: `mock-cert`,
          certFile: `foo.crt`,
          keyFile: `foo.key`,
          directory: `/app/directory`,
        })
      ).resolves.toMatchSnapshot()
    })
    it(`loads a cert from absolute paths`, () => {
      expect(
        getSslCert({
          name: `mock-cert`,
          certFile: `/foo.crt`,
          keyFile: `/foo.key`,
          directory: `/app/directory`,
        })
      ).resolves.toMatchSnapshot()
    })
  })
  describe(`automatic SSL certificate`, () => {
    it(`sets up dev cert`, () => {
      getSslCert({ name: `mock-cert` })
      expect(getDevCert).toBeCalledWith(`mock-cert`, {
        getCaPath: true,
        skipCertutilInstall: false,
        ui: {
          getWindowsEncryptionPassword: expect.any(Function),
        },
      })
      expect(reporter.info.mock.calls).toMatchSnapshot()
    })
    it(`panics if certificate can't be created`, () => {
      getDevCert.mockImplementation(() => {
        throw new Error(`mock error message`)
      })
      getSslCert({ name: `mock-cert` })
      expect(reporter.panic.mock.calls).toMatchSnapshot()
    })
  })
})
